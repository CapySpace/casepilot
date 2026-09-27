import { describe, expect, it } from "vitest";

import {
  authMessages,
  linkProblems,
  messageForAuthError,
  messageForLinkProblem,
  PROVIDER_ERROR_MESSAGES,
} from "@/lib/auth/messages";

const everyMessage = Object.values(authMessages);

describe("the catalogue", () => {
  it("has a message for every provider code it claims to translate", () => {
    for (const [code, message] of Object.entries(PROVIDER_ERROR_MESSAGES)) {
      expect(messageForAuthError({ code }), `code ${code}`).toBe(message);
      expect(everyMessage, `code ${code} maps outside the catalogue`).toContain(message);
    }
  });

  it("has a message for every link problem it can put in a URL", () => {
    for (const [key, message] of Object.entries(linkProblems)) {
      expect(messageForLinkProblem(key), `problem ${key}`).toBe(message);
      expect(everyMessage, `problem ${key} maps outside the catalogue`).toContain(message);
    }
  });

  it("ignores a link problem it does not issue", () => {
    expect(messageForLinkProblem("made-up")).toBeNull();
    expect(messageForLinkProblem(undefined)).toBeNull();
    expect(messageForLinkProblem(["expired-link"])).toBeNull();
  });

  it("falls back rather than crashing on anything unrecognised", () => {
    expect(messageForAuthError({ code: "a_code_from_a_future_release" })).toBe(
      authMessages.unexpected,
    );
    expect(messageForAuthError({})).toBe(authMessages.unexpected);
    expect(messageForAuthError(null)).toBe(authMessages.unexpected);
    expect(messageForAuthError(undefined)).toBe(authMessages.unexpected);
  });

  /**
   * The rule the whole catalogue exists for. A provider's own words leak internals and make the
   * product feel unfinished, so they are not a fallback — they are the thing being kept out.
   */
  it("never lets provider text through, whatever the error carries", () => {
    const raw = 'AuthApiError: relation "auth.users" does not exist (SQLSTATE 42P01)';

    for (const error of [
      { message: raw },
      { code: null, message: raw },
      { code: "unrecognised", message: raw },
      { code: "invalid_credentials", message: raw },
    ]) {
      const shown = messageForAuthError(error);
      expect(shown).not.toContain(raw);
      expect(everyMessage).toContain(shown);
    }
  });

  it("speaks plain language throughout", () => {
    for (const message of everyMessage) {
      expect(message.trim()).not.toBe("");
      // No snake_case identifiers, no error codes, nothing that reads as machine output.
      expect(message, message).not.toMatch(/[a-z]+_[a-z]+/);
      expect(message, message).not.toMatch(/\b(null|undefined|Error|SQLSTATE|4\d\d|5\d\d)\b/);
      // A message a User can act on ends as a sentence does.
      expect(message, message).toMatch(/[.?]$/);
    }
  });
});
