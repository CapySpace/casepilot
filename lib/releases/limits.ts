/**
 * How long a Release's version, name and description may be.
 *
 * Their own module because three things must agree on them and two of those cannot import from the
 * third: the form's hint, the Server Action's validation, and the check constraints in
 * `supabase/migrations/20260928010000_releases_and_builds.sql`. `tests/unit/release-validation.test.ts`
 * reads the migration and fails if the numbers drift apart — the same discipline
 * `lib/projects/limits.ts` set for Projects.
 */

export const MAXIMUM_VERSION_LENGTH = 100;

export const MAXIMUM_NAME_LENGTH = 100;

export const MAXIMUM_DESCRIPTION_LENGTH = 500;
