import { DatabaseZap } from "lucide-react";
import { localPreviewBypass, supabaseConfigured } from "@/lib/config";

export function SetupBanner() {
  if (supabaseConfigured && !localPreviewBypass) return null;
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-[#dfcda7] bg-[#faf4e7] px-3 py-2.5 text-xs text-[#594a2e] sm:mb-6 sm:items-start sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
      <DatabaseZap className="size-4 shrink-0 sm:mt-0.5 sm:size-5" />
      <div>
        <p className="font-semibold">{localPreviewBypass ? "本地预览模式" : "等待连接 Supabase"}</p>
        <p className="mt-0.5 hidden text-[#796746] sm:block">
          {localPreviewBypass
            ? "已跳过本地登录并暂停真实数据写入；关闭预览模式后会恢复正常登录和数据。"
            : "当前为安全预览状态。按 README 配置环境变量并执行数据库迁移后，登录和真实数据保存会自动启用。"}
        </p>
      </div>
    </div>
  );
}
