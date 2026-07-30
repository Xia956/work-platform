import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { localPreviewBypass, publicConfig } from "@/lib/config";

export async function createClient() {
  if (localPreviewBypass) return null;
  if (!publicConfig.supabaseUrl || !publicConfig.supabaseKey) return null;
  const cookieStore = await cookies();

  return createServerClient(publicConfig.supabaseUrl, publicConfig.supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The proxy refreshes cookies when a Server Component cannot.
        }
      },
    },
  });
}
