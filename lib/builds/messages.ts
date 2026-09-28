/**
 * The single source of every message a User can see about a Build.
 *
 * The same discipline as `lib/releases/messages.ts`: nothing formats a message inline, and anything
 * unrecognised still produces something sensible rather than a blank screen.
 */

import { MAXIMUM_BUILD_NUMBER_LENGTH, MAXIMUM_DESCRIPTION_LENGTH } from "./limits";

export const buildMessages = {
  /**
   * Says "build number" rather than "valid build number". A blank field is not an invalid one, and a
   * person who left it empty knows what they did.
   */
  buildNumberRequired: "Give the build a number.",

  buildNumberTooLong: `A build number can be at most ${MAXIMUM_BUILD_NUMBER_LENGTH} characters.`,

  descriptionTooLong: `A description can be at most ${MAXIMUM_DESCRIPTION_LENGTH} characters.`,

  /**
   * The catch-all, for a database that refused something the form thought was fine.
   *
   * It does not say "try again" as an instruction, for the reason `releaseMessages.couldNotCreate`
   * gives: the one thing this message knows is that something unexpected happened.
   */
  couldNotCreate: "Something went wrong creating the build. Nothing has been saved.",

  /**
   * The duplicate refusal. Named the number rather than staying generic, because "which one?" is the
   * Member's next question and the list they came from already answers it.
   */
  buildNumberAlreadyUsed(buildNumber: string) {
    return `${buildNumber} is already used by a build under this release. Choose a different number.`;
  },
} as const;
