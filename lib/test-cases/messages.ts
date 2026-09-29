/**
 * The single source of every message a User can see about a Case.
 *
 * The same discipline as `lib/builds/messages.ts`: nothing formats a message inline, and anything
 * unrecognised still produces something sensible rather than a blank screen.
 */

import {
  MAXIMUM_DESCRIPTION_LENGTH,
  MAXIMUM_EXPECTED_RESULT_LENGTH,
  MAXIMUM_PRECONDITIONS_LENGTH,
  MAXIMUM_STEP_ACTION_LENGTH,
  MAXIMUM_STEP_EXPECTED_RESULT_LENGTH,
  MAXIMUM_STEPS,
  MAXIMUM_TITLE_LENGTH,
} from "./limits";

export const testCaseMessages = {
  /**
   * Says "title" rather than "valid title". A blank field is not an invalid one, and a person who
   * left it empty knows what they did.
   */
  titleRequired: "Give the test case a title.",

  titleTooLong: `A title can be at most ${MAXIMUM_TITLE_LENGTH} characters.`,

  /**
   * Description, preconditions and expected result are optional fields that, once started, must say
   * something — the same reading a blank Release name would get, extended here because a whitespace
   * description renders as a section with nothing in it.
   */
  descriptionBlank: "Remove the description, or write one — it can't be just spaces.",
  descriptionTooLong: `A description can be at most ${MAXIMUM_DESCRIPTION_LENGTH} characters.`,

  preconditionsBlank: "Remove the preconditions, or write some — they can't be just spaces.",
  preconditionsTooLong: `Preconditions can be at most ${MAXIMUM_PRECONDITIONS_LENGTH} characters.`,

  expectedResultBlank: "Remove the expected result, or write one — it can't be just spaces.",
  expectedResultTooLong: `An expected result can be at most ${MAXIMUM_EXPECTED_RESULT_LENGTH} characters.`,

  stepActionRequired: "Give this step an action.",
  stepActionTooLong: `A step's action can be at most ${MAXIMUM_STEP_ACTION_LENGTH} characters.`,
  stepExpectedResultTooLong: `A step's expected result can be at most ${MAXIMUM_STEP_EXPECTED_RESULT_LENGTH} characters.`,

  tooManySteps: `A test case can have at most ${MAXIMUM_STEPS} steps.`,

  /**
   * The catch-all, for a database that refused something the form thought was fine.
   *
   * It does not say "try again" as an instruction, for the reason `buildMessages.couldNotCreate`
   * gives: the one thing this message knows is that something unexpected happened.
   */
  couldNotCreate: "Something went wrong creating the test case. Nothing has been saved.",
} as const;
