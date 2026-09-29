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

  couldNotRecord: "Something went wrong saving this result. Try again.",

  /**
   * The one failure worth naming specifically rather than folding into `couldNotRecord`: the freeze
   * trigger refusing a write because the Attempt was completed — by anyone, possibly moments ago —
   * while this Member still had the execution screen open. Said plainly, because "something went
   * wrong" would be true but unhelpful: nothing is broken, the run just finished under them.
   */
  attemptCompletedWhileEditing:
    "This attempt was completed while you were working on it. Your change was not saved.",

  attemptLabel(attemptNumber: number) {
    return `Attempt #${attemptNumber}`;
  },

  noAttemptsYetTitle: "No testing attempts yet",
  noAttemptsYetDescription: "Start one to begin recording results against this build's test cases.",

  couldNotComplete: "Something went wrong completing the testing attempt. Nothing has changed.",

  couldNotDelete: "Something went wrong deleting the testing attempt. Nothing has changed.",

  deleteAttemptTitle(attemptNumber: number) {
    return `Delete Attempt #${attemptNumber}?`;
  },

  deleteAttemptDescription(attemptNumber: number) {
    return `Attempt #${attemptNumber} and all of its recorded results will be removed. This can't be undone.`;
  },

  deleteAttemptConfirm: "Delete attempt",

  /** Said of a Result nobody has recorded an Outcome against yet — the execution screen's own
   * "Recorded by ... on ..." line, and the Report's read-only mirror of it. */
  notYetRecorded: "Not yet recorded",

  noNotesRecorded: "No notes recorded.",

  /**
   * Who started an Attempt, or last touched a Result, when that person is no longer in the Project.
   * Same wording as `testCaseMessages.personNoLongerInProject` — it is the same fact about a person,
   * said the same way.
   */
  personNoLongerInProject: "someone who has since left the project",

  /** Said on the Build Report when the Build has no `Ready` Case to compute anything from — distinct
   * from `noAttemptsYetTitle`, since a Build can have Attempts and still have nothing Ready left in
   * it (every Case Draft or Deprecated), and vice versa. */
  noReadyCasesTitle: "No ready test cases yet",
  noReadyCasesDescription:
    "Mark at least one test case Ready to start seeing this build's testing progress here.",

  /** Said of the Failure Overview when nothing has ever been Failed or Blocked — distinct from
   * `failureOverviewNoMatchesForFilter`, the same "nothing yet" vs. "nothing matches" distinction
   * `TestCasesSection` already draws for its own search. */
  failureOverviewEmptyTitle: "No failed or blocked test cases",
  failureOverviewEmptyDescription: "Nothing here needs investigation right now.",
  failureOverviewNoMatchesForFilter: "No test cases match this filter.",
} as const;
