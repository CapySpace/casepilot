import { describe, expect, it } from "vitest";

import { isEmailShaped } from "@/lib/email";

/**
 * What CasePilot will accept as an address, in the one place that decides.
 *
 * Deliberately unambitious, and the registration form's own comment says why: a regular expression
 * cannot decide whether an address is real — only a message sent to it can. This rejects what is
 * obviously not an address and leaves the rest to the email that follows.
 */
describe("the shape of an email address", () => {
  it("accepts ordinary addresses", () => {
    expect(isEmailShaped("peter@example.com")).toBe(true);
    expect(isEmailShaped("anna.lee+qa@sub.example.co.uk")).toBe(true);
  });

  it("refuses what is plainly not one", () => {
    expect(isEmailShaped("")).toBe(false);
    expect(isEmailShaped("peter")).toBe(false);
    expect(isEmailShaped("peter@example")).toBe(false);
    expect(isEmailShaped("@example.com")).toBe(false);
    expect(isEmailShaped("two people@example.com")).toBe(false);
    expect(isEmailShaped("peter@exam ple.com")).toBe(false);
  });
});
