import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SidebarNav } from "@/components/sidebar-nav";
import { ProfileMenu } from "@/components/profile-menu";
import { localPreviewBypass, supabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const accountLabel = localPreviewBypass
    ? "本地预览"
    : (user?.email ?? (supabaseConfigured ? "已登录" : "待连接数据源"));

  return (
    <div className="min-h-screen bg-[#f2eee6]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-[#d9d1c5] bg-[#f8f5ef] px-5 py-6 md:flex md:flex-col">
        <Link href="/dashboard" className="mb-10 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md border border-[#b9573a] bg-[#b9573a] text-white">
            <Sparkles className="size-[17px]" strokeWidth={1.8} />
          </span>
          <span>
            <span className="editorial-title block text-[19px]">口播台</span>
            <span className="block text-[9px] tracking-[0.2em] text-[#8b8377] uppercase">Creator Desk</span>
          </span>
        </Link>
        <SidebarNav />
        <div className="mt-auto pt-4">
          <ProfileMenu email={accountLabel} />
        </div>
      </aside>
      <div className="fixed right-4 top-4 z-40 md:hidden">
        <ProfileMenu
          compact
          email={accountLabel}
        />
      </div>
      <main className="mobile-safe-bottom min-h-screen px-3 pb-4 pt-[68px] md:ml-60 md:px-8 md:py-10 xl:px-12">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <SidebarNav />
    </div>
  );
}
