/**
 * How long a Result's notes may be.
 *
 * Its own module because three things must agree on it and two of those cannot import from the third:
 * the execution screen's hint, the Server Action's validation, and the check constraint in
 * `supabase/migrations/20260930000000_test_attempts_and_results.sql`.
 * `tests/unit/test-result-validation.test.ts` reads the migration and fails if the number drifts apart —
 * the same discipline `lib/test-cases/limits.ts` set for Cases.
 */

export const MAXIMUM_NOTES_LENGTH = 2000;
