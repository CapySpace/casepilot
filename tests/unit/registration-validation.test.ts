import { describe, expect, it } from "vitest";

import { authMessages, PASSWORD_RULE } from "@/lib/auth/messages";
import { checkPassword, validateRegistration } from "@/lib/auth/validation";

const valid = {
  fullName: "Alexandra Vance",
  email: "alexandra@company.com",
  password: "correcthorse1",
  acceptedTerms: true,
};

describe("validateRegistration", () => {
  it("accepts a complete, well-formed registration", () => {
    expect(validateRegistration(valid)).toEqual({});
  });

  it("requires a full name", () => {
    expect(validateRegistration({ ...valid, fullName: "   " })).toEqual({
      fullName: authMessages.fullNameRequired,
    });
  });

  it("requires an email address", () => {
    expect(validateRegistration({ ...valid, email: "" })).toEqual({
      email: authMessages.emailRequired,
    });
  });

  it.each(["not-an-email", "missing@tld", "@company.com", "two@@company.com", "spa ce@x.com"])(
    "rejects the malformed address %s",
    (email) => {
      expect(validateRegistration({ ...valid, email })).toEqual({
        email: authMessages.emailMalformed,
      });
    },
  );

  it("requires agreement to the terms", () => {
    expect(validateRegistration({ ...valid, acceptedTerms: false })).toEqual({
      terms: authMessages.termsRequired,
    });
  });

  it.each(["short1", "nodigitshere", "1234567890"])(
    "rejects the weak password %s",
    (password) => {
      expect(validateRegistration({ ...valid, password })).toEqual({
        password: authMessages.passwordTooWeak,
      });
    },
  );

  // The provider's letters_digits policy is the literal ASCII alphabet, so a password of non-ASCII
  // letters plus a digit is refused by the API. Accepting it here would mean the form promising
  // something the provider then refuses — verified against the running stack.
  it.each(["ñññññññ1", "ααααααα1"])("rejects %s, as the provider does", (password) => {
    expect(validateRegistration({ ...valid, password })).toEqual({
      password: authMessages.passwordTooWeak,
    });
  });

  // Whitespace counts towards the length, because it does at the provider — verified by signing up
  // with this exact password against the running stack, which accepted it. Being stricter here than
  // the API would break the rule this form states.
  it("accepts a password padded with spaces, as the provider does", () => {
    expect(validateRegistration({ ...valid, password: "        1a" })).toEqual({});
  });

  it("reports every bad field at once, not just the first", () => {
    expect(validateRegistration({ fullName: "", email: "", password: "", acceptedTerms: false })).toEqual({
      fullName: authMessages.fullNameRequired,
      email: authMessages.emailRequired,
      password: authMessages.passwordTooWeak,
      terms: authMessages.termsRequired,
    });
  });
});

describe("checkPassword", () => {
  it("reports each rule separately, so the form can show progress as they type", () => {
    expect(checkPassword("")).toEqual({ longEnough: false, hasLetter: false, hasDigit: false });
    expect(checkPassword("abc")).toEqual({ longEnough: false, hasLetter: true, hasDigit: false });
    expect(checkPassword("abcdefgh")).toEqual({
      longEnough: true,
      hasLetter: true,
      hasDigit: false,
    });
    expect(checkPassword("abcdefg1")).toEqual({
      longEnough: true,
      hasLetter: true,
      hasDigit: true,
    });
  });
});

/**
 * The criterion is that the rule stated on the form matches the rule actually enforced. Three things
 * have to agree: this copy, the client-side checks, and Supabase's own policy in config.toml
 * (`minimum_password_length = 8`, `password_requirements = "letters_digits"`). A password that
 * satisfies the stated rule must never be rejected by the provider.
 */
describe("the stated password rule", () => {
  it("says eight, a letter and a number, and nothing else", () => {
    expect(PASSWORD_RULE).toContain("8");
    expect(PASSWORD_RULE.toLowerCase()).toContain("letter");
    expect(PASSWORD_RULE.toLowerCase()).toContain("number");
    // The design drew "a number or symbol". The provider offers no such policy, so a symbol alone
    // would be accepted by the form and refused by the API. The copy must not promise it.
    expect(PASSWORD_RULE.toLowerCase()).not.toContain("symbol");
  });

  it("is satisfied by exactly what validateRegistration accepts", () => {
    // Eight characters, a letter and a digit: the boundary the stated rule describes.
    expect(validateRegistration({ ...valid, password: "abcdefg1" })).toEqual({});
    expect(validateRegistration({ ...valid, password: "abcdef1" })).not.toEqual({});
  });
});
