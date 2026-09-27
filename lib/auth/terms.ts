/**
 * The version of the Terms of Service and Privacy Policy currently in force.
 *
 * The database is what actually stamps this onto a profile — see the `terms_version` default in
 * `supabase/migrations/20260927000000_profiles.sql`. This constant mirrors it so the application and
 * the tests can name the current version, and `tests/unit/terms-version.test.ts` fails if the two
 * ever drift apart.
 *
 * Bumping it therefore means writing a migration. That is the point: existing rows must keep the
 * version their User actually agreed to.
 */
export const TERMS_VERSION = "2026-09-27";
