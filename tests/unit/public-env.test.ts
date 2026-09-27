import { describe, expect, it } from "vitest";

import { readPublicEnv } from "@/lib/supabase/env";

describe("readPublicEnv", () => {
  it("reads the Supabase URL and publishable key", () => {
    expect(
      readPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toEqual({
      url: "http://127.0.0.1:54321",
      publishableKey: "sb_publishable_example",
    });
  });

  // A contributor who has not copied .env.example gets this on their first page load, so the
  // message has to say what to do rather than just what is missing.
  it("names the missing variable and how to supply it", () => {
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_URL[\s\S]*\.env\.example/);
  });

  it("rejects a variable that is present but empty", () => {
    expect(() =>
      readPublicEnv({
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "   ",
      }),
    ).toThrowError(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("reports every missing variable at once, not just the first", () => {
    expect(() => readPublicEnv({})).toThrowError(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });
});
