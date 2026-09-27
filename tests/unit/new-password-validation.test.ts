import { describe, expect, it } from "vitest";

import { authMessages } from "@/lib/auth/messages";
import { validateNewPassword } from "@/lib/auth/validation";

describe("validateNewPassword", () => {
  it("accepts a password that meets the rule and is confirmed", () => {
    expect(validateNewPassword({ password: "correcthorse1", confirmation: "correcthorse1" })).toEqual(
      {},
    );
  });

  it("applies the same rule as registration", () => {
    expect(validateNewPassword({ password: "short1", confirmation: "short1" })).toEqual({
      password: authMessages.passwordTooWeak,
    });
    expect(validateNewPassword({ password: "nodigitshere", confirmation: "nodigitshere" })).toEqual({
      password: authMessages.passwordTooWeak,
    });
    // ASCII letters, as the provider enforces.
    expect(validateNewPassword({ password: "ñññññññ1", confirmation: "ñññññññ1" })).toEqual({
      password: authMessages.passwordTooWeak,
    });
  });

  /**
   * Registration has no confirm field — the visibility toggle replaces it. Here it earns its place:
   * the User is typing a password they have never used, so there is nothing to check it against.
   * A typo they cannot see would lock them out of the account they are in the middle of recovering.
   */
  it("requires the password to be confirmed", () => {
    expect(validateNewPassword({ password: "correcthorse1", confirmation: "" })).toEqual({
      confirmation: authMessages.passwordsDoNotMatch,
    });
    expect(validateNewPassword({ password: "correcthorse1", confirmation: "correcthorse2" })).toEqual(
      { confirmation: authMessages.passwordsDoNotMatch },
    );
  });

  // A weak password is worth reporting even when the confirmation also disagrees: they have two
  // things to fix and should be told both.
  it("reports a weak password and a mismatch together", () => {
    expect(validateNewPassword({ password: "short1", confirmation: "different" })).toEqual({
      password: authMessages.passwordTooWeak,
      confirmation: authMessages.passwordsDoNotMatch,
    });
  });

  // Compared exactly. Trimming would let a trailing space through here and be rejected at sign-in.
  it("compares the two exactly", () => {
    expect(
      validateNewPassword({ password: "correcthorse1", confirmation: "correcthorse1 " }),
    ).toEqual({ confirmation: authMessages.passwordsDoNotMatch });
  });
});
