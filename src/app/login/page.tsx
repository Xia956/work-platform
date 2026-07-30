import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { supabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  if (supabase && (await supabase.auth.getUser()).data.user) {
    redirect(safeNextPath(params.next));
  }
  const initialMessage =
    params.error === "auth_callback"
      ? "登录链接无效或已过期，请重新发送。"
      : undefined;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-[#f46f4c] text-2xl text-white">播</span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">欢迎回到口播台</h1>
          <p className="mt-2 text-sm text-[#706b62]">一个账号，收好你的每一次灵感和迭代。</p>
        </div>
        <LoginForm
          configured={supabaseConfigured}
          nextPath={params.next}
          initialMessage={initialMessage}
        />
      </div>
    </main>
  );
}
