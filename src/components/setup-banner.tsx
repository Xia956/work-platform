import { DatabaseZap } from "lucide-react";
import { supabaseConfigured } from "@/lib/config";

export function SetupBanner() {
  if (supabaseConfigured) return null;
  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-[#dfcda7] bg-[#faf4e7] px-4 py-3 text-sm text-[#594a2e]">
      <DatabaseZap className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="font-semibold">等待连接 Supabase</p>
        <p className="mt-0.5 text-[#796746]">
          当前为安全预览状态。按 README 配置环境变量并执行数据库迁移后，登录和真实数据保存会自动启用。
        </p>
      </div>
    </div>
  );
}
