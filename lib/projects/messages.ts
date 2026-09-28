/**
 * The single source of every message a User can see about a Project.
 *
 * The same discipline as `lib/auth/messages.ts`, which declares itself the source of every
 * *authentication* message: nothing formats a message inline, and anything unrecognised still
 * produces something sensible rather than a blank screen.
 *
 * What belongs here: anything that tells a User the outcome or state of something they attempted.
 * What does not: the words that name a screen or a control. Those are the interface; these are what
 * it says back.
 */

import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH } from "./limits";

export const projectMessages = {
  /**
   * Says "name" rather than "valid name". A blank field is not an invalid one, and a person who
   * left it empty knows what they did.
   */
  nameRequired: "Give the project a name.",

  nameTooLong: `A project name can be at most ${MAXIMUM_NAME_LENGTH} characters.`,

  descriptionTooLong: `A description can be at most ${MAXIMUM_DESCRIPTION_LENGTH} characters.`,

  /**
   * The catch-all, for a database that refused something the form thought was fine — a constraint
   * the application does not know about, or a connection that went away mid-write.
   *
   * It does not say "try again" as an instruction, because the one thing this message knows is that
   * something unexpected happened, and promising success on a retry would be a guess.
   */
  couldNotCreate: "Something went wrong creating the project. Nothing has been saved.",

  couldNotUpdate: "Something went wrong saving the project. Nothing has been changed.",

  couldNotInvite: "Something went wrong creating the invitation. Nothing has been created.",

  couldNotCancel: "Something went wrong cancelling the invitation. It is still open.",

  /**
   * The duplicate refusal, which names the address on purpose: an Owner who has forgotten whether they
   * invited somebody is told, and the answer is the same whether they typed it in a different case.
   */
  alreadyInvited(email: string) {
    return `${email} already has an invitation waiting. Cancel it first if you want a new one.`;
  },

  /** Naming them too, because the Owner's next question is "since when?" and the list answers it. */
  alreadyAMember(email: string) {
    return `${email} is already a member of this project.`;
  },

  /** Said once, after an Invitation is created. The Owner sends the link; CasePilot does not. */
  invitationIssued(email: string) {
    return `Invitation created for ${email}. Send them the link below — CasePilot does not email it.`;
  },

  invitationCancelled: "Invitation cancelled. Its link no longer works.",

  /**
   * Who issued an Invitation, when that person is no longer in the Project.
   *
   * Unreachable today — only an Owner can invite, and an Owner cannot leave in this phase — and here so
   * that the answer is a sentence somebody wrote rather than whatever the code falls back to on the day
   * ownership can move. Not "a former member": `CONTEXT.md` is firm that Member is a Role, never a person.
   */
  inviterNoLongerHere: "someone who has since left the project",

  /**
   * What an invitation link says when it is not one, or no longer one.
   *
   * Four different answers, because they ask four different things of the reader: a wrong link means
   * check the link, an expired one means ask for another, a cancelled one means ask whether you should
   * be joining at all, and a spent one usually means you are already in.
   */
  // No advice about copying the whole link: a truncated link does not match the public path pattern at
  // all, so the proxy bounces it to sign-in and this page never sees it. What is reachable is a
  // well-formed token nobody issued.
  invitationNotFound: "This invitation link is not valid. Ask whoever invited you for a new one.",

  invitationExpired:
    "This invitation has expired. Invitations last seven days — ask whoever invited you for a new one.",

  invitationCancelledNotice:
    "This invitation was cancelled. Ask whoever invited you if you should still be joining.",

  invitationAlreadyUsed: "This invitation has already been used.",

  /** Said to somebody holding a link addressed to an address that is not theirs. */
  invitationForSomebodyElse(invited: string, signedInAs: string) {
    return `This invitation was sent to ${invited}, and you are signed in as ${signedInAs}. Sign in as ${invited} to accept it.`;
  },

  alreadyInThisProject: "You are already a member of this project.",

  couldNotAccept: "Something went wrong accepting the invitation. You have not been added.",

  /** Said after a save that worked, because a form that goes quiet leaves the User guessing. */
  projectUpdated: "Project updated.",

  /** The invite form's own two refusals. Its field asks for a colleague, not for "your" address. */
  inviteeRequired: "Enter the email address of the person you want to invite.",

  inviteeMalformed: "That does not look like an email address.",

  /**
   * Shown to a Member on the settings page, where an Owner sees the form.
   *
   * It names the Owner as the person who can, rather than only saying no: somebody who needs a
   * project renamed then knows who to ask.
   */
  onlyOwnerCanEdit: "Only the project owner can change these details.",
} as const;
