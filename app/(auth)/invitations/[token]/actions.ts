"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { previewInvitation } from "@/lib/projects/dal";
import { messageForInvitationState } from "@/lib/projects/invitation-state";
import { hashInvitationToken } from "@/lib/projects/invitation-token";
import { projectMessages } from "@/lib/projects/messages";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = {
  message: string | null;
  /**
   * The Project the message is about, when there is one to offer.
   *
   * Somebody already in a Project is told so and given the way in, rather than silently redirected as if
   * they had just joined — they did not, and a page that quietly moves is a page that leaves them
   * wondering what happened.
   */
  projectId: string | null;
};

type AcceptOutcome = {
  project_id: string | null;
  outcome:
    | "accepted"
    | "used"
    | "expired"
    | "cancelled"
    | "wrong_address"
    | "already_member"
    | "not_found";
};

/**
 * Spending an Invitation.
 *
 * The decision is the database's: `accept_invitation` validates the address, the expiry, the status and
 * any existing Membership, writes the Membership and marks the Invitation accepted, all inside one
 * transaction with the row locked. Two clicks racing therefore produce one Membership and one "already
 * used" rather than two Memberships or an error.
 *
 * This action's whole job is to establish who is asking, hand over the hash, and turn an outcome into a
 * sentence. It re-checks nothing the function checks — a second copy of those rules would be a second
 * place for them to drift.
 */
export async function acceptInvitation(
  _previous: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  // A session is required here and nowhere else on this page: reading an invitation is open to whoever
  // holds the link, but joining a Project is something only a known User can do.
  const user = await verifySession();

  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token_hash: hashInvitationToken(token),
  });

  if (error) {
    console.error("Could not accept an Invitation", error);
    return { message: projectMessages.couldNotAccept, projectId: null };
  }

  const [result] = (data ?? []) as AcceptOutcome[];

  // The one path that leaves this page. Everything else has something to say and says it here.
  if (result?.outcome === "accepted") {
    // The Projects list is about to gain a row, and the Router Cache is still holding the version without
    // it.
    revalidatePath("/projects");
    redirect(`/projects/${result.project_id}`);
  }

  switch (result?.outcome) {
    case "already_member":
      return { message: projectMessages.alreadyInThisProject, projectId: result.project_id };
    case "used":
      return { message: messageForInvitationState("accepted"), projectId: null };
    case "expired":
      return { message: messageForInvitationState("expired"), projectId: null };
    case "cancelled":
      return { message: messageForInvitationState("cancelled"), projectId: null };
    case "not_found":
      return { message: messageForInvitationState("unknown"), projectId: null };
    case "wrong_address": {
      // The page names both addresses before anybody presses anything, so reaching here means the form was
      // posted anyway — by a direct POST, or by a session that changed under an open page. It gets the same
      // explanation rather than a shrug about something going wrong, because nothing did.
      const invitation = await previewInvitation(token);
      return {
        message: invitation
          ? projectMessages.invitationForSomebodyElse(invitation.email, user.email)
          : messageForInvitationState("unknown"),
        projectId: null,
      };
    }
    default:
      // An outcome this application has never heard of. Saying "that link is not valid" would be a guess
      // about somebody else's link; saying something went wrong is the truth.
      console.error("Unrecognised outcome from accept_invitation", result);
      return { message: projectMessages.couldNotAccept, projectId: null };
  }
}
