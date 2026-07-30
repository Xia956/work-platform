import { z } from "zod";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";

const passwordSchema = z.object({
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return Response.json({ error: "登录服务尚未配置。" }, { status: 503 });
  }

  const parsed = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "密码至少需要 8 位。" }, { status: 400 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const email = userData.user?.email;
  if (userError || !email) {
    return Response.json(
      { error: "这次密码重置的登录状态已失效，请返回并重新打开最新一封重置邮件。" },
      { status: 401 },
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    // Hosted Auth can invalidate the recovery session immediately after changing
    // the password. If the new credentials already work, the update did succeed.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (!signInError) return Response.json({ ok: true });

    return Response.json(
      { error: getAuthErrorMessage(updateError, "update") },
      { status: updateError.status || 400 },
    );
  }

  // Establish a fresh normal session because some hosted Auth configurations
  // revoke the recovery session as soon as the password changes.
  await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });

  return Response.json({ ok: true });
}
