/**
 * The single source of every message a User can see about a Result's notes.
 *
 * The same discipline as `lib/test-cases/messages.ts`: nothing formats a message inline, and anything
 * unrecognised still produces something sensible rather than a blank screen.
 */

import { MAXIMUM_NOTES_LENGTH } from "./limits";

export const testResultMessages = {
  /**
   * Notes are optional but, once started, must say something — the same reading test_cases' own
   * optional prose fields (description, preconditions, expected result) get.
   */
  notesBlank: "Remove the notes, or write some — they can't be just spaces.",
  notesTooLong: `Notes can be at most ${MAXIMUM_NOTES_LENGTH} characters.`,

  /**
   * Said in place of the "Record Attempt" action when a Build has nothing to start one against.
   * Deliberately does not say "no test cases yet" — that's `TestCasesSection`'s own empty-state
   * heading, on the same page, and `getByText` matches substrings case-insensitively: the two would
   * collide in the test suite (and, worse, read as an accidental echo to anyone skimming the page).
   */
  noEligibleCases: "Add a test case to this build before starting a testing attempt.",

  couldNotStart: "Something went wrong starting the testing attempt. Nothing has been saved.",

  attemptLabel(attemptNumber: number) {
    return `Attempt #${attemptNumber}`;
  },

  noAttemptsYetTitle: "No testing attempts yet",
  noAttemptsYetDescription: "Start one to begin recording results against this build's test cases.",

  /**
   * Who started an Attempt, or last touched a Result, when that person is no longer in the Project.
   * Same wording as `testCaseMessages.personNoLongerInProject` — it is the same fact about a person,
   * said the same way.
   */
  personNoLongerInProject: "someone who has since left the project",
} as const;
