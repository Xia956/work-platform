import { NextResponse } from "next/server";
import { z } from "zod";
import { databaseError, readJson } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { publicationSchema } from "@/lib/validation";

const createPublicationSchema = publicationSchema.extend({
  script_id: z.string().uuid(),
  script_version_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase 尚未配置" }, { status: 503 });
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const body = await readJson(request);
  if (!body.ok) return body.response;
  const parsed = createPublicationSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "发布信息无效" }, { status: 422 });
  }

  const [{ data: script }, { data: version }, { data: existing }] = await Promise.all([
    supabase
      .from("scripts")
      .select("id, title, status")
      .eq("id", parsed.data.script_id)
      .eq("user_id", auth.user.id)
      .single(),
    supabase
      .from("script_versions")
      .select("id")
      .eq("id", parsed.data.script_version_id)
      .eq("script_id", parsed.data.script_id)
      .eq("user_id", auth.user.id)
      .single(),
    supabase
      .from("publications")
      .select("id")
      .eq("script_id", parsed.data.script_id)
      .eq("user_id", auth.user.id)
      .limit(1)
      .maybeSingle(),
  ]);
  if (!script || !version) {
    return NextResponse.json({ error: "关联内容或实际使用版本不存在" }, { status: 404 });
  }
  if (existing) {
    return NextResponse.json({ error: "这条内容已经登记为已发布" }, { status: 409 });
  }
  if (script.status !== "ready") {
    return NextResponse.json({ error: "只有待发布内容可以标记为已发布" }, { status: 409 });
  }

  const { data: publication, error: publicationError } = await supabase
    .from("publications")
    .insert({ ...parsed.data, title: script.title, user_id: auth.user.id })
    .select()
    .single();
  if (publicationError || !publication) {
    return NextResponse.json(
      { error: databaseError(publicationError?.message ?? "", "发布记录保存失败") },
      { status: 400 },
    );
  }

  const { error: statusError } = await supabase
    .from("scripts")
    .update({ status: "published" })
    .eq("id", script.id)
    .eq("user_id", auth.user.id);
  if (statusError) {
    await supabase.from("publications").delete().eq("id", publication.id).eq("user_id", auth.user.id);
    return NextResponse.json({ error: databaseError(statusError.message, "内容状态更新失败") }, { status: 400 });
  }

  return NextResponse.json({ data: publication }, { status: 201 });
}
