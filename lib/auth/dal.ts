import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** What a protected render is allowed to know about whoever is signed in. */
export type SignedInUser = {
  id: string;
  email: string;
};

/**
 * The authoritative authentication boundary (ADR-0002). Every protected render and every privileged
 * action goes through it.
 *
 * It calls `getUser()`, which asks Supabase directly and therefore notices a session revoked
 * elsewhere — unlike the proxy's local claims check, which cannot. The two are not redundant: the
 * proxy stops protected pages flashing before they redirect, and this stops a route that forgot its
 * own check from being unguarded. Deleting either leaves a real hole.
 *
 * It redirects rather than returning null so that forgetting to handle the signed-out case is not
 * possible. `cache` keeps it to one call per render pass however many components ask.
 */
export const verifySession = cache(async (): Promise<SignedInUser> => {
  const user = await currentUser();

  // Reaching here at all means the proxy's claims check passed, so there *was* a session a moment
  // ago. If the provider now says otherwise it has been revoked or has expired in between — which
  // is exactly the case ADR-0002 says this layer exists to catch, and the one a User is owed an
  // explanation for rather than a silent bounce.
  if (!user) redirect("/sign-in?error=session-expired");

  return user;
});

/**
 * Who is signed in, or null.
 *
 * The same authoritative `getUser()` call as `verifySession`, without the redirect, for the one
 * place that needs to ask rather than insist: choosing a replacement password. That page is public,
 * because somebody arriving on it has only just followed a link from their email — and if the link
 * did not work, the right answer is an explanation and a way to request another, not a bounce to a
 * sign-in form they cannot use.
 *
 * Prefer `verifySession` everywhere else. Returning null invites forgetting to handle it.
 */
export const currentUser = cache(async (): Promise<SignedInUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  // Supabase types email as optional because other identity providers need not supply one. Email
  // and password is the only way into CasePilot — anonymous sign-ins, phone and every external
  // provider are off in config.toml — so this is unreachable. It throws rather than falling back to
  // an empty string because the authenticated page exists to say *whose* session is active, and a
  // blank where the address should be is worse than an error.
  if (!data.user.email) {
    throw new Error(`Signed-in User ${data.user.id} has no email address.`);
  }

  return { id: data.user.id, email: data.user.email };
});

/**
 * The User, but only when their session came from following a recovery link.
 *
 * Verifying a recovery token signs somebody in, so a session on the choose-a-new-password screen
 * is what stands in for "you opened the email". A session on its own is not enough: the provider
 * records *how* it was established, and an ordinary password sign-in must not be able to set a new
 * password without stating the old one. Otherwise borrowed access to an unlocked machine becomes
 * permanent access.
 *
 * `amr` is read from the access token's own claims, which the provider signed, so it is evidence
 * rather than something the browser asserts. `getClaims()` verifies that signature locally.
 */
export const recoveringUser = cache(async (): Promise<SignedInUser | null> => {
  const user = await currentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  const methods: unknown = data?.claims?.amr;
  const followedALink =
    Array.isArray(methods) &&
    methods.some((entry) => (entry as { method?: unknown } | null)?.method === "otp");

  return followedALink ? user : null;
});
