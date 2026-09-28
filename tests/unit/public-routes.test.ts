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

/**
 * The invitation URL is the first public path that is not a fixed string, and the allow-list's own
 * comment explains why that needed care: matching is exact, never by prefix, because a prefix would make
 * `/sign-in-internal-admin` public. A pattern is the same hazard with more rope, so it is anchored at both
 * ends and these are the spellings it must refuse.
 */
describe("the invitation path", () => {
  const token = "a".repeat(43);

  it("is public for a token of the right shape", () => {
    expect(isPublicPath(`/invitations/${token}`)).toBe(true);
    expect(isPublicPath(`/invitations/${"-_aZ09".repeat(7)}x`)).toBe(true);
    // The exact set normalises a trailing slash, and so must the patterns.
    expect(isPublicPath(`/invitations/${token}/`)).toBe(true);
  });

  it("refuses a token of the wrong length", () => {
    expect(isPublicPath(`/invitations/${"a".repeat(42)}`)).toBe(false);
    expect(isPublicPath(`/invitations/${"a".repeat(44)}`)).toBe(false);
    expect(isPublicPath("/invitations/")).toBe(false);
    expect(isPublicPath("/invitations")).toBe(false);
  });

  it("refuses characters a base64url token cannot contain", () => {
    expect(isPublicPath(`/invitations/${"a".repeat(42)}.`)).toBe(false);
    expect(isPublicPath(`/invitations/${"a".repeat(42)}+`)).toBe(false);
    expect(isPublicPath(`/invitations/${"a".repeat(42)}%`)).toBe(false);
    expect(isPublicPath(`/invitations/${"a".repeat(42)} `)).toBe(false);
  });

  it("refuses anything beyond the token", () => {
    expect(isPublicPath(`/invitations/${token}/accept`)).toBe(false);
    expect(isPublicPath(`/invitations/${token}/../projects`)).toBe(false);
    expect(isPublicPath(`/projects/${token}`)).toBe(false);
  });

  it("refuses a path that merely starts the same way", () => {
    expect(isPublicPath(`/invitationsX/${token}`)).toBe(false);
    expect(isPublicPath(`/invitations-internal/${token}`)).toBe(false);
    expect(isPublicPath(`/x/invitations/${token}`)).toBe(false);
  });
});
