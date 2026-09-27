import { describe, expect, it } from "vitest";

import { parseConfirmationLink, safeNext } from "@/lib/auth/confirmation";

function parse(query: string) {
  return parseConfirmationLink(new URLSearchParams(query));
}

describe("parseConfirmationLink", () => {
  it("reads a signup confirmation", () => {
    expect(parse("token_hash=abc123&type=signup&next=/")).toEqual({
      tokenHash: "abc123",
      type: "signup",
      next: "/",
    });
  });

  it("reads a recovery confirmation", () => {
    expect(parse("token_hash=abc123&type=recovery&next=/reset-password")).toEqual({
      tokenHash: "abc123",
      type: "recovery",
      next: "/reset-password",
    });
  });

  it("defaults the destination to the authenticated area", () => {
    expect(parse("token_hash=abc123&type=signup")?.next).toBe("/");
  });

  it("rejects a link with no token", () => {
    expect(parse("type=signup")).toBeNull();
    expect(parse("token_hash=&type=signup")).toBeNull();
  });

  it("rejects a link with no type", () => {
    expect(parse("token_hash=abc123")).toBeNull();
  });

  /**
   * Only the two types Phase 1 sends. The provider understands others — invite, magiclink,
   * email_change — and accepting a type we never issue would mean honouring a link this product
   * has no flow for.
   */
  it("rejects a type this product does not issue", () => {
    expect(parse("token_hash=abc123&type=magiclink")).toBeNull();
    expect(parse("token_hash=abc123&type=invite")).toBeNull();
    expect(parse("token_hash=abc123&type=email_change")).toBeNull();
    expect(parse("token_hash=abc123&type=nonsense")).toBeNull();
  });
});

/**
 * The onward destination arrives in a URL that anybody can write, and it is used as a redirect
 * target. Without this it is an open redirect: a link that verifies a real token and then lands the
 * User on somebody else's sign-in page is exactly the shape of a credible phishing flow.
 */
describe("safeNext", () => {
  it("keeps a path on this site", () => {
    expect(safeNext("/")).toBe("/");
    expect(safeNext("/reset-password")).toBe("/reset-password");
    expect(safeNext("/projects/8f2c?tab=cases")).toBe("/projects/8f2c?tab=cases");
  });

  it("refuses an absolute URL", () => {
    expect(safeNext("https://evil.example/login")).toBe("/");
    expect(safeNext("http://evil.example")).toBe("/");
  });

  // Browsers read `//evil.example` as protocol-relative and leave the site.
  it("refuses a protocol-relative URL", () => {
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("//evil.example/path")).toBe("/");
  });

  it("refuses the backslash spellings browsers normalise into a host", () => {
    expect(safeNext("/\\evil.example")).toBe("/");
    expect(safeNext("\\\\evil.example")).toBe("/");
    expect(safeNext("/\\/evil.example")).toBe("/");
  });

  it("refuses a scheme that is not a page at all", () => {
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("data:text/html,<script>alert(1)</script>")).toBe("/");
  });

  it("falls back when there is nothing to go to", () => {
    expect(safeNext("")).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext(undefined)).toBe("/");
  });

  // Rooted rather than refused: a relative path can only ever resolve to somewhere on this site,
  // which is the property that matters. Refusing it would be stricter without being safer.
  it("roots a relative path", () => {
    expect(safeNext("reset-password")).toBe("/reset-password");
    expect(safeNext("evil.example")).toBe("/evil.example");
  });

  /**
   * `/..//evil.example` resolves to the same origin, so an origin check alone waves it through —
   * but it normalises to `//evil.example`, which is read as a host the next time it is resolved.
   */
  it("refuses a path that normalises into a host", () => {
    expect(safeNext("/..//evil.example")).toBe("/");
    expect(safeNext("/a/../..//evil.example")).toBe("/");
  });

  /**
   * Browsers strip tabs and newlines from URLs, so the danger is not the character surviving — it
   * is what the string becomes once it has gone. What must never happen is a newline reaching a
   * Location header, or the stripping revealing a host.
   */
  it("strips control characters rather than carrying them into a header", () => {
    for (const attempt of ["/reset\npassword", "/reset\tpassword", "/\r\n/evil.example"]) {
      const result = safeNext(attempt);
      expect(result).not.toMatch(/[\u0000-\u001f\u007f]/);
      expect(result.startsWith("/")).toBe(true);
      expect(result.startsWith("//")).toBe(false);
    }
  });
});
