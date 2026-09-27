import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicSupabaseEnv } from "./env";

/**
 * The Supabase client for server context — Server Components, Server Actions and Route Handlers.
 *
 * Create a new one per request. Sharing a client across requests would leak one User's session into
 * another's response.
 *
 * Cookies go through the batched `getAll`/`setAll` interface. The deprecated single-cookie form is
 * not an equivalent shorthand for it: the Supabase SSR docs are explicit that getting this wrong
 * causes random logouts, early session termination and inflated refresh traffic.
 */
export async function createClient() {
  const { url, publishableKey } = publicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. A token refresh that lands during a render is
          // therefore dropped here, and the proxy — which can write — persists it on the next
          // request instead. This is the documented arrangement, not a swallowed bug.
        }
      },
    },
  });
}
