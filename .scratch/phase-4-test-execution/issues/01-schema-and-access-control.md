# 01: Schema and access control

**What to build:** The `test_attempts` and `test_results` tables, their constraints, row-level security,
atomic `attempt_number` numbering, and the completion-freeze trigger — no UI yet, the same foundational
shape Phase 3's schema ticket took. Verified entirely through the RLS and unit test suites; every later
ticket in this phase depends on this one.

See `.scratch/phase-4-test-execution/spec.md` for the full Implementation Decisions this ticket
implements, and `docs/adr/0006-results-snapshot-their-case.md` for why Results snapshot their Case.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `test_attempts` exists with `build_id` (references `builds`, cascades on Build deletion),
      `attempt_number`, `status` (CHECK in `In Progress`/`Completed`, default `In Progress`),
      `created_by`, `started_at`, `completed_at`, `created_at`, `updated_at`
- [x] `attempt_number` is assigned atomically per `build_id` at insert time — the same
      `pg_advisory_xact_lock` pattern `assign_test_case_code()` already uses — and is unique on
      `(build_id, attempt_number)`
- [x] `test_results` exists with `testing_attempt_id` (references `test_attempts`, cascades on Attempt
      deletion), `test_case_id` (references `test_cases`, `on delete restrict`),
      `test_case_title_snapshot`, `test_case_description_snapshot`, `test_case_preconditions_snapshot`,
      `test_case_steps_snapshot` (jsonb), `expected_result_snapshot`, `outcome` (CHECK in `Not Run`/
      `Passed`/`Failed`/`Blocked`/`Skipped`, default `Not Run`), `notes`, `executed_by`, `executed_at`,
      `created_at`, `updated_at`
- [x] `test_results` is unique on `(testing_attempt_id, test_case_id)` — one Result per Case per Attempt
- [x] `notes` is CHECK-constrained: trimmed non-blank when present, ≤ 2000 characters, matching the
      length ceiling `test_cases`' own free-text fields use
- [x] `attempt_project_id(testing_attempt_id)` — `security definer`, `stable`, `set search_path = ''` —
      resolves a Result's Attempt to its Project by chaining `test_attempts.build_id` into the existing
      `build_project_id()`; `execute` revoked from `public`/`anon`, granted to `authenticated`
- [x] `test_attempts` RLS: select/insert/update expressed as `is_project_member(build_project_id
      (build_id))`; insert additionally requires `created_by = auth.uid()`; update's `USING` additionally
      requires `status = 'In Progress'`, which by itself refuses both completing an Attempt twice and
      reopening a Completed one; delete additionally requires `status = 'In Progress'`
- [x] `test_results` RLS: select/insert/update expressed as `is_project_member(attempt_project_id
      (testing_attempt_id))`; no delete policy on `test_results` — Results are only ever removed via
      their parent Attempt's cascade
- [x] A `before update` trigger on `test_results` raises when the parent `test_attempts.status` is
      already `Completed`, refusing the write outright regardless of what RLS would otherwise permit
- [x] A non-member's select on either table returns nothing, insert fails with `42501`, and update/delete
      silently affect no row
- [x] `tests/rls/testing-attempts.test.ts` covers every boundary above, plus a concurrency test firing two
      simultaneous Attempt-starts on the same Build and asserting the two rows get distinct
      `attempt_number`s
- [x] `tests/unit/test-result-validation.test.ts` covers `notes`' blankness and length rules and that the
      valid-Outcome set matches the migration's CHECK constraint, reading from the same limits module the
      constraint is generated to match
