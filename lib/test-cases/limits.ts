/**
 * How long a Case's fields may be, and how many steps it may have.
 *
 * Their own module because three things must agree on them and two of those cannot import from the
 * third: the form's hint, the Server Action's validation, and the check constraints in
 * `supabase/migrations/20260929000000_test_cases.sql`. `tests/unit/test-case-validation.test.ts` reads
 * the migration and fails if the numbers drift apart — the same discipline `lib/builds/limits.ts` set
 * for Builds.
 */

export const MAXIMUM_TITLE_LENGTH = 200;

export const MAXIMUM_DESCRIPTION_LENGTH = 2000;

export const MAXIMUM_PRECONDITIONS_LENGTH = 2000;

export const MAXIMUM_EXPECTED_RESULT_LENGTH = 2000;

export const MAXIMUM_STEP_ACTION_LENGTH = 500;

export const MAXIMUM_STEP_EXPECTED_RESULT_LENGTH = 500;

export const MAXIMUM_STEPS = 50;
