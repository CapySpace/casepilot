import { describe, expect, it } from "vitest";

import { authMessages, messageForAuthError } from "@/lib/auth/messages";

describe("messageForAuthError", () => {
  it("translates wrong credentials", () => {
    expect(messageForAuthError({ code: "invalid_credentials" })).toBe(
      authMessages.invalidCredentials,
    );
  });

  it("translates an unverified email address", () => {
    expect(messageForAuthError({ code: "email_not_confirmed" })).toBe(
      authMessages.emailNotConfirmed,
    );
  });

  it("falls back for a code it does not know", () => {
    expect(messageForAuthError({ code: "some_code_invented_after_this_was_written" })).toBe(
      authMessages.unexpected,
    );
  });

  it("falls back when there is no code at all", () => {
    expect(messageForAuthError({})).toBe(authMessages.unexpected);
    expect(messageForAuthError(null)).toBe(authMessages.unexpected);
    expect(messageForAuthError(undefined)).toBe(authMessages.unexpected);
  });

  // The whole point of the catalogue: a User must never be shown provider text. It leaks internals
  // and makes the product feel unfinished.
  it("never passes provider text through, even when that is all the error carries", () => {
    const raw = "AuthApiError: relation \"auth.users\" does not exist (SQLSTATE 42P01)";

    expect(messageForAuthError({ message: raw })).toBe(authMessages.unexpected);
    expect(messageForAuthError({ code: "unrecognised", message: raw })).not.toContain(raw);
  });

  it("returns a catalogued message for every code it claims to handle", () => {
    for (const message of Object.values(authMessages)) {
      expect(message).not.toBe("");
      // Plain language: no error codes, no snake_case identifiers leaking into the copy.
      expect(message).not.toMatch(/[a-z]+_[a-z]+/);
    }
  });
});
