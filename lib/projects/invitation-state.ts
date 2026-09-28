import { projectMessages } from "./messages";

/**
 * The state an Invitation can be in, as the interface talks about it.
 *
 * The database has two vocabularies for the same facts — `invitation_preview` says `accepted` where
 * `accept_invitation` says `used` — because they answer different questions. One name each, here, so that
 * a page and a button cannot describe the same link in different words.
 */
export type InvitationState = "pending" | "expired" | "cancelled" | "accepted" | "unknown";

/**
 * What to say about a link that cannot be taken up.
 *
 * `pending` has no message because there is nothing to explain: the page shows the invitation itself.
 */
export function messageForInvitationState(state: Exclude<InvitationState, "pending">): string {
  switch (state) {
    case "expired":
      return projectMessages.invitationExpired;
    case "cancelled":
      return projectMessages.invitationCancelledNotice;
    case "accepted":
      return projectMessages.invitationAlreadyUsed;
    case "unknown":
      return projectMessages.invitationNotFound;
  }
}
