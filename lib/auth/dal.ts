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
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/sign-in");
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
