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
  fullName: string;
};

/** Satisfies the policy the provider enforces: eight or more, letters and digits. */
const PASSWORD = "correcthorse1";

/** The local stack's mail catcher. Keep in step with `[local_smtp] port` in supabase/config.toml. */
const MAIL_CATCHER_URL = "http://127.0.0.1:54324";

async function createUser(confirmed: boolean): Promise<SeededUser> {
  const email = newEmail();
  const fullName = "Seeded Tester";

  const { error } = await admin().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: confirmed,
    // The same metadata the registration form sends. The trigger reads it to build the profile,
    // and full_name is NOT NULL, so a User cannot be created without one — including from here.
    // The terms record is stamped by the database, not supplied, so there is nothing to pass.
    user_metadata: { full_name: fullName },
  });

  if (error) throw new Error(`Could not seed a User: ${error.message}`);

  return { email, password: PASSWORD, fullName };
}

/** A User who has confirmed their email address and can therefore sign in. */
export function createVerifiedUser(): Promise<SeededUser> {
  return createUser(true);
}

/** A fresh address, so tests never inherit each other's state. */
export function newEmail(): string {
  return `seeded-${randomUUID()}@example.com`;
}

export type Profile = {
  full_name: string;
  terms_accepted_at: string;
  terms_version: string;
};

/** Raised when no User has that address, so callers can tell it apart from a genuine failure. */
export class NoSuchUserError extends Error {
  constructor(email: string) {
    super(`No User exists for ${email}`);
    this.name = "NoSuchUserError";
  }
}

/**
 * Asks the provider for one address rather than listing every User and scanning.
 *
 * Called through `fetch` rather than `listUsers`, because supabase-js builds that request's query
 * string from `page` and `per_page` alone and would drop the filter without saying so — leaving a
 * scan of the first page pretending to be a lookup. GoTrue's admin endpoint does support it.
 */
async function findUserId(email: string): Promise<string> {
  const response = await fetch(
    `${requiredEnv("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
    {
      headers: {
        apikey: requiredEnv("SUPABASE_SECRET_KEY"),
        Authorization: `Bearer ${requiredEnv("SUPABASE_SECRET_KEY")}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Could not look up ${email}: ${response.status} ${response.statusText}`);
  }

  const { users } = (await response.json()) as { users: { id: string; email?: string }[] };
  // `filter` is a search, not an exact match, so confirm the address rather than take the first hit.
  const user = users.find((candidate) => candidate.email === email);
  if (!user) throw new NoSuchUserError(email);

  return user.id;
}

/**
 * The profile row the database trigger created for an address.
 *
 * Read through the administrative API because row-level security lets a User see only their own,
 * and a test has no session.
 */
export async function readProfile(email: string): Promise<Profile> {
  const id = await findUserId(email);

  const { data, error } = await admin()
    .from("profiles")
    .select("full_name, terms_accepted_at, terms_version")
    .eq("id", id)
    .single<Profile>();

  if (error) throw new Error(`No profile exists for ${email}: ${error.message}`);

  return data;
}

/** A User who has registered but not yet followed the link in their email. */
export function createUnverifiedUser(): Promise<SeededUser> {
  return createUser(false);
}

/**
 * How many emails the local mail catcher has seen for an address.
 *
 * Used to assert that something did *not* arrive. Asserting an absence needs a starting count, so
 * callers take one before acting.
 */
export async function emailsSentTo(address: string): Promise<number> {
  const response = await fetch(
    `${MAIL_CATCHER_URL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
  );
  if (!response.ok) {
    throw new Error(`Could not read the mail catcher: ${response.status} ${response.statusText}`);
  }
  const { messages_count: count } = (await response.json()) as { messages_count: number };
  return count;
}

/**
 * A signup confirmation token minted straight through the administrative interface.
 *
 * Most verification tests take this route: it is the same one-time token the email would have
 * carried, without the wait or the parsing. Exactly one test in the suite goes the long way round
 * through the mail catcher, and it is the one that proves registering really does send a working
 * link.
 */
export async function mintSignupToken(): Promise<{ user: SeededUser; tokenHash: string }> {
  const email = newEmail();
  const fullName = "Minted Tester";

  const response = await fetch(`${requiredEnv("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      apikey: requiredEnv("SUPABASE_SECRET_KEY"),
      Authorization: `Bearer ${requiredEnv("SUPABASE_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "signup",
      email,
      password: PASSWORD,
      data: { full_name: fullName },
    }),
  });

  if (!response.ok) {
    throw new Error(`Could not mint a signup link: ${response.status} ${response.statusText}`);
  }

  const { hashed_token: tokenHash } = (await response.json()) as { hashed_token: string };

  return { user: { email, password: PASSWORD, fullName }, tokenHash };
}

/** The most recent message the mail catcher holds for an address, as HTML. */
export async function latestEmailTo(address: string): Promise<string> {
  const list = await fetch(
    `${MAIL_CATCHER_URL}/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
  );
  if (!list.ok) throw new Error(`Could not search the mail catcher: ${list.status}`);

  const { messages } = (await list.json()) as { messages: { ID: string }[] };
  if (messages.length === 0) throw new Error(`No email was sent to ${address}`);

  const message = await fetch(`${MAIL_CATCHER_URL}/api/v1/message/${messages[0].ID}`);
  if (!message.ok) throw new Error(`Could not read the email: ${message.status}`);

  const { HTML } = (await message.json()) as { HTML: string };
  return HTML;
}
