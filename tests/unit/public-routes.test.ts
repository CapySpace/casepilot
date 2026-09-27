import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/lib/auth/routes";

describe("isPublicPath", () => {
  it("lets the authentication routes through", () => {
    expect(isPublicPath("/sign-in")).toBe(true);
    expect(isPublicPath("/sign-up")).toBe(true);
    expect(isPublicPath("/forgot-password")).toBe(true);
    expect(isPublicPath("/reset-password")).toBe(true);
    expect(isPublicPath("/check-email")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
  });

  it("lets the pages registration asks people to agree to through", () => {
    expect(isPublicPath("/terms")).toBe(true);
    expect(isPublicPath("/privacy")).toBe(true);
  });

  it("protects the authenticated area", () => {
    expect(isPublicPath("/")).toBe(false);
  });

  // Default-deny, per ADR-0002: a route nobody has thought about yet is already protected.
  it("protects a route that does not exist yet", () => {
    expect(isPublicPath("/projects/8f2c/cases/TC-101")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
  });

  /**
   * The trap in matching by prefix: `/sign-in` as a prefix would make `/sign-in-internal-admin`
   * public. Matching is exact.
   */
  it("does not let a path merely starting with a public one through", () => {
    expect(isPublicPath("/sign-in-internal-admin")).toBe(false);
    expect(isPublicPath("/sign-upgrade")).toBe(false);
    expect(isPublicPath("/auth/confirm/../../secrets")).toBe(false);
  });

  it("treats a trailing slash as the same route", () => {
    expect(isPublicPath("/sign-in/")).toBe(true);
    expect(isPublicPath("/auth/confirm/")).toBe(true);
  });

  // Routes are case-sensitive, so this is not the sign-in page. Fail closed.
  it("fails closed on a differently-cased path", () => {
    expect(isPublicPath("/SIGN-IN")).toBe(false);
  });
});
