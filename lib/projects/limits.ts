/**
 * How long a Project's name and description may be.
 *
 * Their own module because three things must agree on them and two of those cannot import from the
 * third: the form's hint, the Server Action's validation, and the check constraints in
 * `supabase/migrations/20260927010000_projects.sql`. `tests/unit/project-validation.test.ts` reads
 * the migration and fails if the numbers drift apart.
 */

export const MAXIMUM_NAME_LENGTH = 100;

export const MAXIMUM_DESCRIPTION_LENGTH = 500;
