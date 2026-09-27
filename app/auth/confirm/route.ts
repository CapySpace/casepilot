import { NextResponse, type NextRequest } from "next/server";

import { parseConfirmationLink } from "@/lib/auth/confirmation";
import type { LinkProblem } from "@/lib/auth/messages";
import { createClient } from "@/lib/supabase/server";

/**
 * The confirmation endpoint. One handler, both email flows, no interface.
 *
 * It reads a one-time token hash and a type from the query string, verifies the token with the
 * provider, and redirects onward to the destination the link carries. A signup confirmation lands
 * in the authenticated area; ticket 06's recovery links land on the form for choosing a new
 * password. Adding a second endpoint for that would be two things to keep in step.
 *
 * Verifying a token signs the User in, which is what makes registration and first use one motion:
 * they follow the link and they are simply inside.
 */
export async function GET(request: NextRequest) {
  // A relative Location, resolved by the browser against the request it actually made. Building an
  // absolute URL would mean trusting `request.nextUrl.origin`, which is derived from a Host header
  // the caller supplies — and this endpoint is reachable by anyone holding a link.
  const sendTo = (path: string) =>
    new NextResponse(null, { status: 303, headers: { Location: path } });
  const withProblem = (problem: LinkProblem) => sendTo(`/sign-in?error=${problem}`);

  const link = parseConfirmationLink(request.nextUrl.searchParams);

  // Malformed, or a type this product never issues. Distinguishable from a token the provider
  // refused, and worth distinguishing: this one is not going to start working.
  if (!link) return withProblem("invalid-link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: link.type,
    token_hash: link.tokenHash,
  });

  if (error) {
    // A stale link in an inbox is the commonest way to get here, and somebody who is already
    // signed in has nothing to fix. Send them where the link was taking them rather than showing
    // them an error about a thing that has already happened.
    const { data } = await supabase.auth.getUser();
    if (data.user) return sendTo(link.next);

    return withProblem("expired-link");
  }

  return sendTo(link.next);
}
