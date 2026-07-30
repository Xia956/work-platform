import { redirect } from "next/navigation";
import { UpdatePasswordForm } from "@/components/update-password-form";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(safeNextPath(params.next))}`);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#f46f4c] text-xl text-white">播</span>
          <h1 className="mt-4 text-2xl font-black tracking-[-0.04em]">设置新密码</h1>
          <p className="mt-2 text-sm text-[#706b62]">设置完成后会继续保持登录。</p>
        </div>
        <UpdatePasswordForm nextPath={params.next} />
      </div>
    </main>
  );
}
