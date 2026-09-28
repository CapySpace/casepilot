"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { verifySession } from "@/lib/auth/dal";
import { hashInvitationToken } from "@/lib/projects/invitation-token";
import { projectMessages } from "@/lib/projects/messages";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = {
  message: string | null;
};

type Outcome = {
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
 * sentence. It does not re-check anything the function checks — a second copy of those rules would be a
 * second place for them to drift.
 */
export async function acceptInvitation(
  _previous: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  // A session is required here and nowhere else on this page: reading an invitation is open to whoever
  // holds the link, but joining a Project is something only a known User can do.
  await verifySession();

  const token = String(formData.get("token") ?? "");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("accept_invitation", {
    p_token_hash: hashInvitationToken(token),
  });

  if (error) {
    console.error("Could not accept an Invitation", error);
    return { message: projectMessages.couldNotAccept };
  }

  const [result] = (data ?? []) as Outcome[];

  switch (result?.outcome) {
    case "accepted":
      // The Projects list is about to gain a row, and the Router Cache is still holding the version
      // without it.
      revalidatePath("/projects");
      redirect(`/projects/${result.project_id}`);
    // `redirect` throws, so nothing below runs for the accepted case.
    case "already_member":
      redirect(`/projects/${result.project_id}`);
    case "used":
      return { message: projectMessages.invitationAlreadyUsed };
    case "expired":
      return { message: projectMessages.invitationExpired };
    case "cancelled":
      return { message: projectMessages.invitationCancelledNotice };
    case "wrong_address":
      // The page already names both addresses, because it knows them before anybody presses anything.
      // Reaching this means the form was posted anyway.
      return { message: projectMessages.couldNotAccept };
    default:
      return { message: projectMessages.invitationNotFound };
  }
}
