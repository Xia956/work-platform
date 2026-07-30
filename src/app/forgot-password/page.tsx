import { redirect } from "next/navigation";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { localPreviewBypass, supabaseConfigured } from "@/lib/config";
import { safeNextPath } from "@/lib/validation";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  if (localPreviewBypass) redirect(safeNextPath(params.next));

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f46f4c] text-xl text-white">播</span>
          <h1 className="mt-4 text-2xl font-black tracking-[-0.04em]">设置或找回密码</h1>
          <p className="mt-2 text-sm leading-6 text-[#706b62]">现有邮箱账号第一次设置密码，也从这里开始。</p>
        </div>
        <ForgotPasswordForm configured={supabaseConfigured} nextPath={params.next} />
      </div>
    </main>
  );
}
