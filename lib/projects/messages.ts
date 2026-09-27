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

  /** Said after a save that worked, because a form that goes quiet leaves the User guessing. */
  projectUpdated: "Project updated.",

  /**
   * Shown to a Member on the settings page, where an Owner sees the form.
   *
   * It names the Owner as the person who can, rather than only saying no: somebody who needs a
   * project renamed then knows who to ask.
   */
  onlyOwnerCanEdit: "Only the project owner can change these details.",
} as const;
