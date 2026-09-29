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
} as const;
