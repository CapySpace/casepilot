/**
 * The two browser-safe Supabase credentials, and nothing else. The secret key is not here and must
 * not be: it is server-only, used exclusively by the test suite, and enforced absent from the
 * rendering tree by tests/unit/secret-key-containment.test.ts.
 */
export type PublicSupabaseEnv = {
  url: string;
  publishableKey: string;
};

type PublicSupabaseEnvSource = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
};

function present(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}

/**
 * Validates a set of environment values. Separated from reading `process.env` so it can be tested
 * without mutating the ambient environment.
 */
export function readPublicEnv(source: PublicSupabaseEnvSource): PublicSupabaseEnv {
  const missing = (
    ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] as const
  ).filter((name) => !present(source[name]));

  if (missing.length > 0) {
    throw new Error(
      `Missing Supabase configuration: ${missing.join(", ")}. ` +
        `Copy .env.example to .env.local — see the README's "Getting started".`,
    );
  }

  return {
    url: source.NEXT_PUBLIC_SUPABASE_URL!,
    publishableKey: source.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  };
}

/**
 * The public credentials for the current environment.
 *
 * Each variable is read as a literal property of `process.env`, which is what lets Next.js inline it
 * into the browser bundle. A computed lookup — `process.env[name]` — compiles to `undefined` in the
 * browser and fails only at runtime, so do not refactor these into a loop.
 */
export function publicSupabaseEnv(): PublicSupabaseEnv {
  return readPublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
