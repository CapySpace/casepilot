import { createHash, randomBytes } from "node:crypto";

/**
 * The secret in an Invitation link, and the only form of it the database ever sees.
 *
 * An Invitation is a bearer credential for exactly one Membership, so the raw token exists in the
 * link and nowhere else: `project_invitations` stores this hash, which means a leaked backup yields
 * nothing replayable. ADR-0004 records the decision.
 *
 * Both sides of the phase use this module — the action that issues a link, and the page that spends
 * one — because two implementations of the same hash would drift and every link in circulation would
 * stop working the day they did.
 */

/** A fresh token and the hash to store beside it. */
export type InvitationToken = {
  token: string;
  tokenHash: string;
};

/**
 * How long an Invitation is good for: seven days.
 *
 * Here rather than in the action or the tests because three things will read it — the action that
 * stamps `expires_at`, the copy that tells an Owner when the link dies, and the suite that produces an
 * expired one — and a lifetime that disagrees with the sentence beside it is the kind of bug nobody
 * reports. `lib/auth/terms.ts` sets the precedent.
 */
export const INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * 32 bytes of randomness, base64url-encoded: 43 characters, safe in a path, and well beyond guessing.
 *
 * The length matters beyond entropy: the public path pattern that makes an invitation URL reachable
 * while signed out matches on it. That pattern does not exist yet — `lib/auth/routes.ts` is still an
 * exact-match allow-list, and ticket 06 adds the anchored form — so this is a constraint on that
 * ticket, not a rule already in force.
 */
export function mintInvitationToken(): InvitationToken {
  const token = randomBytes(32).toString("base64url");

  return { token, tokenHash: hashInvitationToken(token) };
}

/**
 * SHA-256, hex-encoded.
 *
 * A token is 256 bits of randomness rather than a password, so there is nothing to slow an attacker
 * down for: a work factor here would cost every acceptance and buy nothing a brute force could use.
 */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
