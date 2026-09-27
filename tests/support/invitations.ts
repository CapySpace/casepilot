import { INVITATION_LIFETIME_MS, mintInvitationToken } from "@/lib/projects/invitation-token";

import type { ActingUser } from "./clients";

export type IssuedInvitation = {
  token: string;
  tokenHash: string;
  email: string;
};

/** The fields an Invitation row needs, as the Owner's action will supply them. */
type InvitationRow = {
  project_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  invited_by?: string;
};

function invitationRow(
  projectId: string,
  email: string,
  expiresInMs = INVITATION_LIFETIME_MS,
): InvitationRow {
  return {
    project_id: projectId,
    email: email.toLowerCase(),
    token_hash: mintInvitationToken().tokenHash,
    expires_at: new Date(Date.now() + expiresInMs).toISOString(),
  };
}

/**
 * Attempts to insert an Invitation and hands back whatever PostgREST said.
 *
 * For the tests about being refused — a Member who may not invite, a second live Invitation, an
 * address that is not lower-cased. `inviteByEmail` is for the ones that must succeed.
 */
export function attemptInvite(
  actor: ActingUser,
  projectId: string,
  email: string,
  overrides: Partial<InvitationRow> = {},
) {
  return actor.client
    .from("project_invitations")
    .insert({ ...invitationRow(projectId, email), ...overrides });
}

/**
 * Issues an Invitation the way the Owner's action will: mint a token, store its hash, keep the token
 * for the link.
 *
 * `expiresInMs` is how an expired Invitation is produced — the alternative, waiting seven days, is
 * not a test.
 */
export async function inviteByEmail(
  owner: ActingUser,
  projectId: string,
  email: string,
  { expiresInMs = INVITATION_LIFETIME_MS }: { expiresInMs?: number } = {},
): Promise<IssuedInvitation> {
  const { token, tokenHash } = mintInvitationToken();
  const row = { ...invitationRow(projectId, email, expiresInMs), token_hash: tokenHash };

  const { error } = await owner.client.from("project_invitations").insert(row);
  if (error) throw new Error(`Could not invite ${email}: ${error.message}`);

  return { token, tokenHash, email };
}
