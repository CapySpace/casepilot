/**
 * How long a Build's number and description may be.
 *
 * Their own module because three things must agree on them and two of those cannot import from the
 * third: the form's hint, the Server Action's validation, and the check constraints in
 * `supabase/migrations/20260928010000_releases_and_builds.sql`. `tests/unit/build-validation.test.ts`
 * reads the migration and fails if the numbers drift apart — the same discipline
 * `lib/releases/limits.ts` set for Releases.
 */

export const MAXIMUM_BUILD_NUMBER_LENGTH = 100;

export const MAXIMUM_DESCRIPTION_LENGTH = 500;
