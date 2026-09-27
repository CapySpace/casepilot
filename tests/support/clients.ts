import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createVerifiedUser, requiredEnv, type SeededUser } from "./users";

/**
 * A real User with a real session, holding the key a browser holds.
 *
 * The RLS suite acts through these and nothing else. Using the secret key here would prove nothing:
 * it bypasses row-level security by design, so every assertion would pass whatever the policies
 * said.
 */
export type ActingUser = SeededUser & {
  id: string;
  client: SupabaseClient;
};

/** A verified User, signed in, ready to be told no. */
export async function signedInUser(): Promise<ActingUser> {
  const seeded = await createVerifiedUser();

  const client = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    // No storage, no refresh loop: each acting User lives for one test file and holds its session in
    // memory, so nothing leaks between tests and nothing keeps a timer alive after they finish.
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await client.auth.signInWithPassword({
    email: seeded.email,
    password: seeded.password,
  });

  if (error || !data.user) {
    throw new Error(`Could not sign in the seeded User ${seeded.email}: ${error?.message}`);
  }

  return { ...seeded, id: data.user.id, client };
}

/**
 * A client with no session at all, holding the same publishable key any visitor's browser holds.
 *
 * The invitation preview is reachable while signed out, so "what can anon do" is a question with a
 * real answer rather than a theoretical one.
 */
export function anonymousClient(): SupabaseClient {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/**
 * The administrative client, for the two things a policy can never be asked about.
 *
 * Constraints and foreign keys are not row-level security: a unique index refuses the service role
 * exactly as it refuses anybody, and a cascade is what the database does when a row goes. Those are
 * facts this suite is entitled to assert, and the only way to assert them is to write as somebody who
 * is allowed to.
 *
 * It is **never** setup. A Membership written from here would prove nothing about whether the real
 * path is permitted, which is the only question this suite exists to answer — so Memberships are made
 * by accepting Invitations, as people make them.
 */
export function adminClient(): SupabaseClient {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
