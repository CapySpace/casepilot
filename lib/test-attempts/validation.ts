import { MAXIMUM_NOTES_LENGTH } from "./limits";
import { testResultMessages } from "./messages";

export const TEST_RESULT_OUTCOMES = ["Not Run", "Passed", "Failed", "Blocked", "Skipped"] as const;
export type TestResultOutcome = (typeof TEST_RESULT_OUTCOMES)[number];

/** What a newly-started Attempt's Results get — must agree with the column default in the migration. */
export const DEFAULT_TEST_RESULT_OUTCOME: TestResultOutcome = "Not Run";

/**
 * Validates a Result's notes: optional, but once started must say something — the same reading
 * `test_cases`' own optional prose fields get, not "nobody wrote one" — and bounded by
 * `MAXIMUM_NOTES_LENGTH`. Runs in the browser for immediate feedback and again in the Server Action,
 * because browser validation is not a security control.
 */
export function validateNotes(notes: string): string | undefined {
  if (notes !== "" && notes.trim() === "") return testResultMessages.notesBlank;
  if (notes.trim().length > MAXIMUM_NOTES_LENGTH) return testResultMessages.notesTooLong;
  return undefined;
}
