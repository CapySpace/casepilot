# Results snapshot their Case, rather than reading it live

A Result does not display its Case's title, description, preconditions, steps or expected result by
joining to `test_cases`; it copies those fields into its own columns the moment its Attempt is
created, and never reads them again. This is necessary because a Case is not versioned — Phase 3
lets any Member edit one freely, including after Attempts have recorded Passed/Failed verdicts
against it — so a live join would let an unrelated later edit silently rewrite what an already
-completed Result meant, without the Result row itself ever changing. That breaks the guarantee
CasePilot exists for: a history that can be audited rather than overwritten.

## Considered Options

- **Live join to `test_cases`.** Simpler, no duplication, but a historical Result would describe
  "the Case as it reads today," not "the Case as it was tested" — the opposite of what an Attempt
  Report is for. Rejected.
- **Full Case versioning** (append-only history on `test_cases`, Results reference a specific
  version). Would let a Result also reconstruct *why* it snapshotted what it did, and would serve
  other future uses of Case history beyond execution. Deferred: Phase 4 only needs a completed
  Attempt to be immutable, not a general-purpose Case history, and versioning is a larger, separable
  piece of work.

## Consequences

- Deleting or editing a Case never touches any existing Result, by construction — Results hold no
  live display path back to a Case's mutable fields, only `test_case_id` for cross-navigation. This
  is also why Cases are soft-deleted, never hard-deleted (see `test_cases.deleted_at`): `test_case_id`
  must keep resolving for as long as any Result references it.
- A Result is wrong forever if its snapshot was captured incorrectly (e.g. a bug in the copy at
  Attempt-start time) — nothing can later correct it without giving up the immutability it exists to
  provide. A new Attempt, not an edit, is the only way to re-test under corrected wording.
- Five fields now live in two places — once, current, on the Case; once, frozen, on every Result ever
  taken against it. That duplication is the cost of the guarantee, not an oversight.
