"use server";

import { revalidatePath } from "next/cache";

import { listProjectPeople, requireProjectOwnership } from "@/lib/projects/dal";
import { INVITATION_LIFETIME_MS, mintInvitationToken } from "@/lib/projects/invitation-token";
import { projectMessages } from "@/lib/projects/messages";
import { validateInvitation, type InvitationErrors } from "@/lib/projects/validation";
import { createClient } from "@/lib/supabase/server";

export type InviteState = {
  errors: InvitationErrors;
  /** A failure that belongs to no single field. */
  message: string | null;
  /** Said once, after an Invitation is created. */
  notice: string | null;
  /**
   * The path of the link just issued, for the Owner to send.
   *
   * A path and not a URL: the origin is the browser's to supply, because the server's only idea of its
   * own address comes from a Host header the caller writes (see `app/auth/confirm/route.ts`).
   *
   * It appears exactly once, in the response to creating it. The token itself is nowhere else — the
   * database holds only its hash — so there is nothing to show again later, which is the point.
   */
  invitationPath: string | null;
  /**
   * Who the link above was issued to.
   *
   * The form compares it against the Invitations still waiting: cancelling one revalidates the page but
   * cannot reach into this state, so without this the Owner would be left looking at "Invitation created
   * for X" and a live-looking link directly beneath copy explaining that cancelling stops it working.
   */
  issuedTo: string | null;
  /** Echoed back so a rejected attempt does not cost the Owner what they typed. */
  email: string;
};

/** Postgres's unique-violation code: the partial index on one pending Invitation per address. */
const UNIQUE_VIOLATION = "23505";

export async function inviteToProject(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const projectId = String(formData.get("projectId") ?? "");
  // The id arrives in a field, so ownership of *that* Project is what is checked. A caller who edits it
  // gets the 404 a stranger gets, and row-level security refuses the insert underneath.
  await requireProjectOwnership(projectId);

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const nothingYet = {
    errors: {},
    message: null,
    notice: null,
    invitationPath: null,
    issuedTo: null,
    email,
  };

  const errors = validateInvitation({ email });
  if (Object.keys(errors).length > 0) {
    return { ...nothingYet, errors };
  }

  // Already in the Project? Asked first, because "they are already here" is a better answer than "they
  // already have an invitation", and a Member with a stale Invitation could produce both.
  //
  // Through the Data Access Layer, which is the only door to `project_people` and the only version that
  // throws when the query fails. Asking the client directly — as this did for an hour — turns a failed
  // read into an empty list, and an empty list here reads as "not a member": permission to invite,
  // granted by a database error.
  const people = await listProjectPeople(projectId);
  if (people.some((person) => person.email.toLowerCase() === email)) {
    return { ...nothingYet, message: projectMessages.alreadyAMember(email) };
  }

  const supabase = await createClient();

  // A pending Invitation that has expired keeps its slot in the unique index — the index cannot say
  // "and not expired", because its predicate must be immutable and `now()` is not. So expiry is
  // cleared here rather than being a dead end, and a *live* Invitation is refused below.
  const { error: supersede } = await supabase
    .from("project_invitations")
    .update({ status: "cancelled" })
    .eq("project_id", projectId)
    .eq("email", email)
    .eq("status", "pending")
    .lte("expires_at", new Date().toISOString());

  if (supersede) {
    console.error(`Could not clear an expired Invitation for ${email}`, supersede);
    return { ...nothingYet, message: projectMessages.couldNotInvite };
  }

  const { token, tokenHash } = mintInvitationToken();
  const { error } = await supabase.from("project_invitations").insert({
    project_id: projectId,
    email,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + INVITATION_LIFETIME_MS).toISOString(),
  });

  if (error) {
    // The database is the authority on "one live Invitation per address", not a check this action made
    // a moment earlier: two Owners' clicks could both pass such a check and only one can win.
    if (error.code === UNIQUE_VIOLATION) {
      return { ...nothingYet, message: projectMessages.alreadyInvited(email) };
    }

    console.error(`Could not invite ${email} to Project ${projectId}`, error);
    return { ...nothingYet, message: projectMessages.couldNotInvite };
  }

  revalidatePath(`/projects/${projectId}/members`);

  return {
    errors: {},
    message: null,
    notice: projectMessages.invitationIssued(email),
    invitationPath: `/invitations/${token}`,
    issuedTo: email,
    // Cleared: the address has been invited, and leaving it in the box invites inviting them twice.
    email: "",
  };
}

export type CancelState = {
  message: string | null;
  notice: string | null;
};

export async function cancelInvitation(
  _previous: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const projectId = String(formData.get("projectId") ?? "");
  await requireProjectOwnership(projectId);

  const invitationId = String(formData.get("invitationId") ?? "");
  const supabase = await createClient();

  // `status` is matched as well as the id, so cancelling twice is not an error and an accepted
  // Invitation cannot be retracted after the fact. The policy allows only pending → cancelled anyway.
  const { error } = await supabase
    .from("project_invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId)
    .eq("project_id", projectId)
    .eq("status", "pending");

  if (error) {
    console.error(`Could not cancel Invitation ${invitationId}`, error);
    return { message: projectMessages.couldNotCancel, notice: null };
  }

  revalidatePath(`/projects/${projectId}/members`);

  return { message: null, notice: projectMessages.invitationCancelled };
}

export type RemoveState = {
  /**
   * A failure, and only a failure.
   *
   * There is no success message, because there would be nowhere to put one: removal takes the row away, and
   * with it the component that would have displayed it. The row's absence and the count above the table are
   * what say it worked.
   */
  message: string | null;
};

/**
 * Removing somebody from a Project.
 *
 * The Membership is the access, so deleting it is the whole of removal and it takes effect at once: the
 * Project leaves their list and its URL answers 404, because row-level security has nothing left to match.
 *
 * An Owner cannot remove themselves this way — the policy excludes their own row, which is what stops
 * "remove" being a way to do what "leave" refuses — and no Member can remove anybody.
 */
export async function removeFromProject(
  _previous: RemoveState,
  formData: FormData,
): Promise<RemoveState> {
  const projectId = String(formData.get("projectId") ?? "");
  await requireProjectOwnership(projectId);

  const userId = String(formData.get("userId") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);

  if (error) {
    console.error(`Could not remove User ${userId} from Project ${projectId}`, error);
    return { message: projectMessages.couldNotRemove };
  }

  revalidatePath(`/projects/${projectId}/members`);

  return { message: null };
}
