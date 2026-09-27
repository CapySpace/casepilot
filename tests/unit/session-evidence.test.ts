import { describe, expect, it } from "vitest";

import { carriesAuthCookie } from "@/lib/auth/routes";

/**
 * Being sent to sign-in needs an explanation only when something was lost. Somebody who simply
 * arrived signed out has nothing explained to them, and telling them their session expired would
 * be a lie. The evidence that there was a session is that the browser is still carrying its cookie.
 */
describe("carriesAuthCookie", () => {
  it("sees the provider's session cookie", () => {
    expect(carriesAuthCookie([{ name: "sb-127-auth-token" }])).toBe(true);
    expect(carriesAuthCookie([{ name: "sb-abcdefg-auth-token.0" }])).toBe(true);
    expect(carriesAuthCookie([{ name: "other" }, { name: "sb-x-auth-token" }])).toBe(true);
  });

  it("is not fooled by something merely starting with sb-", () => {
    expect(carriesAuthCookie([{ name: "sb-preferences" }])).toBe(false);
    expect(carriesAuthCookie([{ name: "sbx-auth-token" }])).toBe(false);
  });

  it("says no when there is nothing there", () => {
    expect(carriesAuthCookie([])).toBe(false);
    expect(carriesAuthCookie([{ name: "theme" }])).toBe(false);
  });
});
