import type { NextRequest } from "next/server";

import { isPublicPath } from "@/lib/auth/routes";
import { createProxyClient } from "@/lib/supabase/proxy";

/**
 * Default-deny request interception (ADR-0002).
 *
 * Next.js 16 renamed the `middleware` convention to `proxy`, functionality unchanged. Every
 * Supabase guide in circulation still shows `middleware.ts`; this is the same thing under its
 * current name.
 *
 * This layer is optimistic, not authoritative. Its job is to stop a protected page rendering and
 * then vanishing behind a redirect. The Data Access Layer decides whether anyone actually gets
 * data — see `lib/auth/dal.ts`.
 */
export async function proxy(request: NextRequest) {
  const { supabase, respond } = createProxyClient(request);

  // `getClaims()` and nothing else. It verifies the JWT signature against a JWKS cached for the
  // life of the process, so after the first request there is no network call and never a database
  // one. That matters because this runs on prefetches too — `getUser()` here would put a round
  // trip behind every link the User merely hovers.
  const { data } = await supabase.auth.getClaims();
  const signedIn = data?.claims != null;

  if (!signedIn && !isPublicPath(request.nextUrl.pathname)) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    // No explanation from here. Telling somebody their session expired when they simply arrived
    // signed out would be a lie about their own history, and this layer cannot tell the two apart
    // without inspecting cookie names — which the testing rules rightly forbid reaching for, and
    // which the library will not do for us: it reports a dead cookie as no cookie at all.
    //
    // The case that matters is covered a layer down. A session that dies while somebody is using
    // it still passes the claims check here and is caught by the Data Access Layer, which knows it
    // was reached only because a session existed a moment ago.
    signIn.search = "";
    return respond(signIn);
  }

  // A signed-in User is deliberately *not* bounced away from the authentication pages. They need to
  // be able to sign out and back in as somebody else — on a shared machine especially.
  return respond();
}

export const config = {
  /**
   * Everything except Next.js's own static output and image files. Authentication should run on all
   * routes; narrowing this matcher to a list of protected ones would reintroduce exactly the
   * forget-and-expose failure that default-deny exists to prevent.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
