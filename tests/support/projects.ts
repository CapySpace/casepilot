import { randomUUID } from "node:crypto";

import { hashInvitationToken } from "@/lib/projects/invitation-token";

import type { ActingUser } from "./clients";
import { inviteByEmail } from "./invitations";

/**
 * Creates a Project the way the application will have to: with an id the caller generates.
 *
 * A Project cannot be read back from its own INSERT — the SELECT policy is applied to the RETURNING
 * row before the trigger has written the Owner's Membership — so the id comes from the caller rather
 * than from the database. `tests/rls/projects.test.ts` asserts that behaviour directly.
 */
export async function createProject(
  owner: ActingUser,
  name = "Mobile Banking App",
  description: string | null = null,
): Promise<string> {
  const id = randomUUID();

  const { error } = await owner.client.from("projects").insert({ id, name, description });
  if (error) throw new Error(`Could not create a Project as ${owner.email}: ${error.message}`);

  return id;
}

/**
 * A Project with a second person in it, joined the way a person actually joins: an Invitation the
 * Owner issued and the invitee accepted.
 *
 * Deliberately not a Membership written with the secret key. A row inserted by an administrator
 * proves nothing about whether the policies allow the real path, which is the only thing this suite
 * is for.
 */
export async function projectWithMember(
  owner: ActingUser,
  member: ActingUser,
  name = "Mobile Banking App",
): Promise<string> {
  const project = await createProject(owner, name);
  const { token } = await inviteByEmail(owner, project, member.email);

  const { data, error } = await member.client.rpc("accept_invitation", {
    p_token_hash: hashInvitationToken(token),
  });

  if (error) throw new Error(`Could not accept an Invitation as ${member.email}: ${error.message}`);
  if (data?.[0]?.outcome !== "accepted") {
    throw new Error(`Invitation was not accepted: ${data?.[0]?.outcome}`);
  }

  return project;
}
