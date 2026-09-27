import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  hashInvitationToken,
  INVITATION_LIFETIME_MS,
  mintInvitationToken,
} from "@/lib/projects/invitation-token";

describe("minting an Invitation token", () => {
  it("produces a URL-safe token of 43 characters", () => {
    const { token } = mintInvitationToken();

    // 32 random bytes, base64url-encoded and unpadded. The length is asserted because the public
    // path pattern that will make an Invitation URL reachable while signed out matches on it — see
    // the note in the module; that pattern arrives with ticket 06.
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("never repeats", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => mintInvitationToken().token));

    expect(tokens.size).toBe(50);
  });

  it("carries the hash of its own token", () => {
    const { token, tokenHash } = mintInvitationToken();

    expect(tokenHash).toBe(hashInvitationToken(token));
  });
});

describe("hashing an Invitation token", () => {
  it("is SHA-256, hex-encoded", () => {
    // An independent statement of the algorithm: if the module ever changes how it hashes, every
    // link already in somebody's inbox stops working, so the algorithm is a fact worth pinning.
    expect(hashInvitationToken("a-known-token")).toBe(
      createHash("sha256").update("a-known-token").digest("hex"),
    );
    expect(hashInvitationToken("a-known-token")).toHaveLength(64);
  });

  it("is stable across calls", () => {
    expect(hashInvitationToken("same")).toBe(hashInvitationToken("same"));
    expect(hashInvitationToken("same")).not.toBe(hashInvitationToken("different"));
  });
});

describe("an Invitation's lifetime", () => {
  it("is seven days", () => {
    // Stated as the spec states it, so a change to the constant has to be a change to a sentence
    // somebody wrote on purpose.
    expect(INVITATION_LIFETIME_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
