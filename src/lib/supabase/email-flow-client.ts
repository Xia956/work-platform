import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import { publicConfig } from "@/lib/config";

function requireConfig() {
  if (!publicConfig.supabaseUrl || !publicConfig.supabaseKey) {
    throw new Error("Supabase 尚未配置");
  }
  return publicConfig;
}

export function createEmailRequestClient() {
  const config = requireConfig();
  return createSupabaseClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      flowType: "implicit",
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export function createEmailLandingClient() {
  const config = requireConfig();
  return createBrowserClient(config.supabaseUrl, config.supabaseKey, {
    isSingleton: false,
    auth: { detectSessionInUrl: false },
  });
}
