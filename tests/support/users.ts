import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Seeds Users straight through Supabase's administrative API.
 *
 * This is the only place the secret key is used, and it lives here rather than anywhere the
 * application can reach it — `tests/unit/secret-key-containment.test.ts` enforces that.
 *
 * Minting Users this way bypasses email for speed and determinism. It is not a way of avoiding the
 * real provider: these are genuine Supabase Users, and the tests that follow drive the real
 * application against them. Exactly one test in the suite goes the long way round through the mail
 * catcher, and that one belongs to ticket 05.
 */

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local — see the README's "Getting started".`,
    );
  }
  return value;
}

let client: SupabaseClient | undefined;

function admin(): SupabaseClient {
  client ??= createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  return client;
}

export type SeededUser = {
  email: string;
  password: string;
};

/** Satisfies the policy the provider enforces: eight or more, letters and digits. */
const PASSWORD = "correcthorse1";

async function createUser(confirmed: boolean): Promise<SeededUser> {
  // A fresh address per test, so tests can run in parallel and do not inherit each other's state.
  const email = `seeded-${randomUUID()}@example.com`;

  const { error } = await admin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: confirmed,
  });

  if (error) throw new Error(`Could not seed a User: ${error.message}`);

  return { email, password: PASSWORD };
}

/** A User who has confirmed their email address and can therefore sign in. */
export function createVerifiedUser(): Promise<SeededUser> {
  return createUser(true);
}

/** A User who has registered but not yet followed the link in their email. */
export function createUnverifiedUser(): Promise<SeededUser> {
  return createUser(false);
}
