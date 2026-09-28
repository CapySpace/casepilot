/**
 * The single source of every message a User can see about a Release.
 *
 * The same discipline as `lib/projects/messages.ts`: nothing formats a message inline, and anything
 * unrecognised still produces something sensible rather than a blank screen.
 */

import { MAXIMUM_DESCRIPTION_LENGTH, MAXIMUM_NAME_LENGTH, MAXIMUM_VERSION_LENGTH } from "./limits";

export const releaseMessages = {
  /**
   * Says "version" rather than "valid version". A blank field is not an invalid one, and a person
   * who left it empty knows what they did.
   */
  versionRequired: "Give the release a version.",

  versionTooLong: `A version can be at most ${MAXIMUM_VERSION_LENGTH} characters.`,

  nameTooLong: `A release name can be at most ${MAXIMUM_NAME_LENGTH} characters.`,

  descriptionTooLong: `A description can be at most ${MAXIMUM_DESCRIPTION_LENGTH} characters.`,

  /**
   * The catch-all, for a database that refused something the form thought was fine.
   *
   * It does not say "try again" as an instruction, for the reason `projectMessages.couldNotCreate`
   * gives: the one thing this message knows is that something unexpected happened.
   */
  couldNotCreate: "Something went wrong creating the release. Nothing has been saved.",

  couldNotUpdate: "Something went wrong saving the release. Nothing has been changed.",

  /** Said once, after a save that worked — the same reason `projectMessages.projectUpdated` gives. */
  releaseUpdated: "Release updated.",

  /**
   * The duplicate refusal. Named the version rather than staying generic, because "which one?" is
   * the Member's next question and the list they came from already answers it.
   */
  versionAlreadyUsed(version: string) {
    return `${version} is already used by a release in this project. Choose a different version.`;
  },
} as const;
