# 01: Schema and access control

**What to build:** The `test_cases` table, its constraints, its row-level security, and atomic `TC-nnn`
numbering — no UI yet, the same shape Phase 2's schema ticket took. Verified entirely through the RLS
and unit test suites; every later ticket in this phase depends on this one.

See `.scratch/phase-3-test-case-management/spec.md` for the full Implementation Decisions this ticket
implements, and `docs/adr/0005-cases-belong-to-a-build.md` for why Cases are Build-scoped.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `test_cases` exists with `build_id` (references `builds`, cascades on Build deletion), `code`,
      `title`, `description`, `preconditions`, `steps` (jsonb), `expected_result`, `priority`, `status`,
      `created_by`, `updated_by`, `created_at`, `updated_at`, `deleted_at`
- [x] CHECK constraints enforce: `title` trimmed non-blank, 1–200 characters; `description`,
      `preconditions`, `expected_result` each ≤ 2000 characters and non-blank when present; `steps` is a
      JSON array of at most 50 objects, each with a non-blank `action` of 1–500 characters and an
      optional `expectedResult` of ≤ 500 characters; `priority` in `Low`/`Medium`/`High`/`Critical`
      (default `Medium`); `status` in `Draft`/`Ready`/`Deprecated` (default `Draft`)
- [x] `code` (e.g. `TC-003`) is assigned atomically per `build_id` at insert time — never computed as
      "count of existing Cases plus one" — and is unique on `(build_id, code)` including soft-deleted
      rows, so a code is never reissued
- [x] A `build_project_id(build_id)` function resolves a Build to its Project through its Release; every
      policy on `test_cases` is expressed as `is_project_member(build_project_id(build_id))`
- [x] Any Member of the Project — not only its Owner or the Case's creator — can select, insert and
      update `test_cases`; a non-member's select returns nothing, a non-member's insert fails with
      `42501`, and a non-member's update silently affects no row (the ordinary Postgres RLS shape for a
      `USING`-only refusal, not an error)
- [x] There is no Postgres `DELETE` policy on `test_cases` — a `DELETE` is refused outright regardless of
      who issues it
- [x] "Deleting" a Case is an `UPDATE` setting `deleted_at`, permitted by the same full-membership
      `UPDATE` policy as any other edit
- [x] A freeze trigger stops `id`, `build_id`, `code`, `created_by` and `created_at` from ever changing,
      and stops a once-set `deleted_at` from being un-set or changed
- [x] `updated_at` and `updated_by` update automatically on every edit, `updated_by` starting equal to
      `created_by` at insert
- [x] `tests/rls/test-cases.test.ts` covers every boundary above, plus a concurrency test firing two
      simultaneous inserts under the same Build and asserting the two rows get distinct codes
- [x] A unit test suite covers the field-length/shape validation module, reading the same limits the
      migration's CHECK constraints use, mirroring `tests/unit/build-validation.test.ts`'s own
      drift-detection discipline
