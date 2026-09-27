import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { publicSupabaseEnv } from "./env";

export type ProxySupabase = {
  /**
   * Client for the default-deny check in `proxy.ts`. Use `getClaims()` and nothing else: it verifies
   * the JWT signature locally against the project's JWKS, with no network or database call, which
   * matters because the proxy also runs on prefetches. `getUser()` belongs in the Data Access
   * Layer, which is the authoritative boundary (ADR-0002).
   */
  supabase: SupabaseClient;
  /**
   * The response to return from the proxy, carrying any session the client refreshed while checking
   * claims. Call with no argument to let the request through, or with a URL to redirect.
   *
   * Building a bare `NextResponse.redirect()` instead would drop a refresh that happened during the
   * check, and the next request would refresh again — the usual cause of intermittent spurious
   * sign-outs under server rendering.
   */
  respond: (redirectTo?: URL) => NextResponse;
};

/**
 * The Supabase client for proxy context.
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`; the functionality is unchanged. Every
 * Supabase guide in circulation still says `middleware`, so this file is the translation.
 */
export function createProxyClient(request: NextRequest): ProxySupabase {
  const { url, publishableKey } = publicSupabaseEnv();

  let passThrough = NextResponse.next({ request });
  const refreshedCookies: { name: string; value: string; options: CookieOptions }[] = [];
  const requiredHeaders: Record<string, string> = {};

  function carryRefreshedSession<T extends NextResponse>(response: T): T {
    for (const { name, value, options } of refreshedCookies) {
      response.cookies.set(name, value, options);
    }
    // Responses that set auth cookies must not be cached, or a CDN can serve one User's session
    // token to another. The library tells us which headers that needs.
    for (const [name, value] of Object.entries(requiredHeaders)) {
      response.headers.set(name, value);
    }
    return response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Write to the request as well as the response: the pass-through response is rebuilt from
        // the request, and this is what carries the refreshed session into the render that follows.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        refreshedCookies.push(...cookiesToSet);
        Object.assign(requiredHeaders, headers);
        passThrough = carryRefreshedSession(NextResponse.next({ request }));
      },
    },
  });

  return {
    supabase,
    respond(redirectTo) {
      return redirectTo
        ? carryRefreshedSession(NextResponse.redirect(redirectTo))
        : passThrough;
    },
  };
}
