import { AuthConfirmForm } from "@/components/auth-confirm-form";
import { supabaseConfigured } from "@/lib/config";
import { safeAuthTokenHash, safeNextPath } from "@/lib/validation";

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
}) {
  const params = await searchParams;
  const tokenHash =
    params.type === "email" ? safeAuthTokenHash(params.token_hash) : null;
  const nextPath = safeNextPath(params.next);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-[#f46f4c] text-2xl text-white">
            播
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">
            完成登录
          </h1>
          <p className="mt-2 text-sm text-[#706b62]">
            最后一步，确认后进入你的口播工作台。
          </p>
        </div>
        <AuthConfirmForm
          configured={supabaseConfigured}
          tokenHash={tokenHash}
          nextPath={nextPath}
        />
      </div>
    </main>
  );
}
