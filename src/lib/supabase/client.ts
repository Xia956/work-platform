import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/config";

export function createClient() {
  if (!publicConfig.supabaseUrl || !publicConfig.supabaseKey) {
    throw new Error("Supabase 尚未配置");
  }
  return createBrowserClient(publicConfig.supabaseUrl, publicConfig.supabaseKey);
}
