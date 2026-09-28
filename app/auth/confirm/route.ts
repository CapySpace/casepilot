import { NextResponse, type NextRequest } from "next/server";

import { parseConfirmationLink } from "@/lib/auth/confirmation";
import { takeRememberedDestination } from "@/lib/auth/destination";
import type { AuthNotice } from "@/lib/auth/messages";
import { AUTHENTICATED_HOME } from "@/lib/auth/routes";
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
    new NextResponse(null, {
      status: 303,
      headers: {
        Location: path,
        // The token is in the URL, so this response must not be stored and must not travel on to
        // the destination page as a referrer.
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  const withNotice = (notice: AuthNotice) => sendTo(`/sign-in?error=${notice}`);

  const link = parseConfirmationLink(request.nextUrl.searchParams);

  // Malformed, or a type this product never issues. Distinguishable from a token the provider
  // refused, and worth distinguishing: this one is not going to start working.
  if (!link) return withNotice("invalid-link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: link.type,
    token_hash: link.tokenHash,
  });

  // Consumed either way, success or failure: a destination that outlived its confirmation would pull
  // somebody sideways on the next one.
  const remembered = await takeRememberedDestination();

  if (error) {
    // A spent *signup* link in an inbox is the commonest way to get here, and somebody who is
    // already signed in has nothing left to fix — so send them where the link was going rather
    // than explain an error about something that has already happened.
    //
    // Only for signup. A recovery link that fails verification must stay failed: otherwise anybody
    // holding a session could write themselves a link with a nonsense token and be handed the
    // destination of their choosing, which is a failed check reported as a success.
    if (link.type === "signup") {
      const { data } = await supabase.auth.getUser();
      if (data.user) return sendTo(onwardFrom(link.next, remembered));
    }

    return withNotice("expired-link");
  }

  return sendTo(onwardFrom(link.next, remembered));
}

/**
 * Where the User goes after the token is spent.
 *
 * The link's own destination wins when it has one of its own, which is what makes a recovery link land on
 * the reset form. Otherwise it is whatever registration remembered — the invitation somebody was opening
 * when they were asked to make an account — and failing that, their Projects.
 *
 * Both halves are already reduced to a path on this site: `parseConfirmationLink` runs the link's through
 * `safeNext`, and `takeRememberedDestination` runs the cookie's through the same guard.
 */
function onwardFrom(fromLink: string, remembered: string | null): string {
  if (fromLink !== AUTHENTICATED_HOME) return fromLink;

  return remembered ?? AUTHENTICATED_HOME;
}
