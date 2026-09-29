# Phase 4 — Test Execution and Testing Attempts

Status: ready-for-agent

## Problem Statement

A Build in CasePilot now holds Cases — Phase 3 made sure of that — but nothing in the product records
what happens when someone actually runs them. A tester who works through Build 100's Cases today has
nowhere to say "I tried this one, it passed," nowhere to say "this one's blocked," and nowhere for a
colleague to later ask "did we test this build, and how did it go?" Every run is either kept in someone's
head or in a spreadsheet CasePilot knows nothing about, and the moment that person edits a Case afterward
— fixing a typo in its steps — there is no way to know whether last week's "Passed" still means anything.
`CONTEXT.md`'s own opening line promises "a history that can be audited rather than overwritten"; today
there is no history to audit at all.

## Solution

A Build now holds Attempts — `Project → Release → Build → Case` and, alongside it, `Build → Attempt →
Result` — matching how QA teams already think about a test run: a specific pass through a specific
Build's Cases, started by someone, worked by whoever picks it up, and eventually closed out. Starting an
Attempt takes a snapshot of the Build's Cases as they stand at that moment — title, description,
preconditions, steps, expected result, all copied — so that editing a Case afterward can never reach back
and change what an already-recorded Result meant. Any Member can start an Attempt, record a Result against
each of its Cases (Passed, Failed, Blocked or Skipped, plus notes), and any Member can pick up where
another left off — the same shared-editing model Phases 2 and 3 already established.

Build Details gains a Testing Attempts section: every Attempt taken against the Build, its number, who
started it, its progress, its Outcome breakdown, and its status. Starting one drops the tester straight
into an execution screen that moves through the Attempt's Cases, saving each Result the moment it's
recorded — no separate save step. Marking an Attempt Completed freezes its Results permanently and turns
it into a read-only report: overall progress, the full Outcome breakdown, every individual Result, and who
ran it and when.

## User Stories

### Starting an Attempt

1. As a Member, I want to start a new Attempt for a Build, so that I have a dedicated place to record what happens when its Cases are run.
2. As a Member, I want the Attempt to include every non-deleted Case belonging to the Build at the moment I start it, regardless of the Case's own Draft/Ready/Deprecated status, so the Attempt reflects the Build's actual scope.
3. As a Member, I want a Case added to the Build after an Attempt has already started to not appear in that Attempt, so its "Tested: X / Y" count stays meaningful for the rest of the run.
4. As a Member, I want the Attempt to keep its own copy of every Case's title, description, preconditions, steps and expected result as they stood the moment I started it, so a later edit to a Case can never change what this Attempt recorded.
5. As a Member opening a Build with no eligible Cases, I want "Start Testing Attempt" refused with an explanation, so I don't create a meaningless empty Attempt.
6. As a Member, I want each new Attempt on a Build numbered sequentially (#1, #2, #3…), so I can refer to "Attempt #3" in conversation without ambiguity.
7. As a Member, I want two Attempts started on the same Build at nearly the same moment by different colleagues to still get two different numbers, so the collision-safety Cases already have extends to Attempts.
8. As a Member, I want to start a new Attempt on a Build that already has one in progress, so re-testing or parallel testing by different colleagues isn't blocked by someone else's unfinished run.
9. As a Member, I want to see who started an Attempt and when, so I know who to ask about it.

### Executing an Attempt

10. As a Member, I want to move through an Attempt's Cases one at a time, so I can focus on what I'm testing right now without losing track of the rest.
11. As a Member, I want to see a Case's full snapshot — title, description, preconditions, steps and expected result — while recording its Outcome, so I have everything I need without leaving the execution screen.
12. As a Member, I want to record a Case's Outcome as Passed, Failed, Blocked or Skipped, so the Attempt reflects what actually happened.
13. As a Member, I want a Case I haven't touched yet to show as Not Run, so the difference between "checked and fine" and "not looked at" is never ambiguous.
14. As a Member, I want to add free-text notes to a Result, so I can record what I saw beyond a single word.
15. As a Member, I want my Outcome and notes to save the moment I record them, without a page reload or a separate "Save" step, so recording forty Cases doesn't mean forty page loads.
16. As a Member, I want to change a Result I already recorded — a different Outcome, edited notes — any time before the Attempt is completed, so an early mistake isn't permanent.
17. As any Member, not only whoever started the Attempt, I want to record or edit Results on an in-progress Attempt, so two colleagues can split the work of one run.
18. As a Member, I want to see who last touched a Result, and when, so I know how current the record is.
19. As a Member, I want to jump straight to any Case in the Attempt, not only step through in order, so I can prioritise or revisit freely.

### Progress and results

20. As a Member, I want to see how many of an Attempt's Cases have been tested against how many total ("Tested: 18 / 25"), so I know how much is left.
21. As a Member, I want a breakdown by Outcome — Passed, Failed, Blocked, Skipped, Not Run counts — so I know not just how much is done but how it's going.
22. As a Member, I want that breakdown to update the moment I record a Result, so the number on screen is never stale.

### Completing an Attempt

23. As a Member, I want to mark an Attempt Completed once I'm done with it, so it becomes part of the Build's testing history.
24. As a Member, I want to complete an Attempt even if some Cases are still Not Run, so an interrupted or partial run can still be closed out and reported on rather than left dangling forever.
25. As a Member, I want a Completed Attempt's Results to become permanently read-only, so a later look at it always shows what was actually found during that run.
26. As a Member, I want a Completed Attempt to never be reopened, so "the run that's marked done" always means exactly that.
27. As a Member, I want to see when an Attempt was completed, alongside when it was started, so I know how long the run took.

### Deleting an Attempt

28. As a Member, I want to delete an Attempt I started by mistake while it's still in progress, so it doesn't clutter the Build's history.
29. As any Member, not only whoever started it, I want to delete an in-progress Attempt, so tidying up a mistake doesn't bottleneck on one person.
30. As a Member, I want a Completed Attempt to be undeletable, so a finished historical record can never quietly disappear.

### The Testing Attempts list

31. As a Member viewing a Build, I want to see every Attempt taken against it, so I know its full testing history at a glance.
32. As a Member, I want each Attempt in that list to show its number, who started it, its progress, its Outcome breakdown, its status, and its start and completion times, so I don't have to open each one to get an overview.
33. As a Member opening a Build with no Attempts yet, I want an honest empty state explaining how to start one, so I don't think the feature is broken.

### Attempt Detail / Report

34. As a Member, I want to open a past Attempt and see a read-only report of it — overall progress, result counts, every individual Result, who ran it, and when — so I can review exactly what happened without wading through the Build's live Cases.
35. As a Member, I want an in-progress Attempt to also be viewable in this read-only form, so a colleague can check on how testing is going without accidentally editing it.
36. As a Member, I want the URL to name the Project, Release, Build and Attempt I'm looking at, so I can bookmark it, share it, and open two Attempts in two tabs.

### Access control

37. As a Member, I want Attempt and Result data reachable only by people in the Attempt's Project, enforced by the database, so a bug in a page can't leak it.
38. As a non-member, I want an Attempt's URL to tell me nothing — not even that it exists — so identifiers can't be used to map other teams' testing activity.
39. As a User, I want the API to refuse what the interface refuses — no completing, deleting or editing an Attempt or Result outside the rules above — so calling Supabase directly isn't a way round them.
40. As a Member, I want a Result reached by its own id under the wrong Attempt, or an Attempt reached under the wrong Build, to be treated as not found, so a stale or guessed link can't show me the wrong record dressed up as the right one.

## Implementation Decisions

**Vocabulary is settled in `CONTEXT.md` and ADR-0006.** Attempt and Result are new terms; a Result's
verdict is an **Outcome**, never a status, to keep it distinct from a Case's own Status
(Draft/Ready/Deprecated) and an Attempt's own Status (In Progress/Completed) — three different axes that
used to risk sharing one overloaded word. The grey/dormant Outcome is named **Not Run**, matching
`DESIGN.md`'s status scale and Phase 3's own spec text, not the "Not Tested" wording floated earlier in
planning.

**Schema: two new tables, `test_attempts` and `test_results`**, named to match `test_cases`' own `test_`
prefix rather than the originally suggested `testing_attempts`.

`test_attempts`: `id`; `build_id` (references `builds`, cascades on Build deletion); `attempt_number`
(integer, a per-Build sequence assigned atomically at insert time under a row lock scoped to `build_id`,
the same `pg_advisory_xact_lock` pattern `assign_test_case_code()` already uses for `TC-nnn`, so two
Members starting an Attempt on the same Build at the same moment still get two different numbers; unique
on `(build_id, attempt_number)`); `status` (text, CHECK in `In Progress`/`Completed`, default `In
Progress` — Title Case, matching `test_cases.status`'s own casing convention rather than the
`SCREAMING_SNAKE` suggested in planning); `created_by` (references `auth.users`, `on delete restrict`,
provenance — this is who the interface shows as the Attempt's "tester"); `started_at`, `completed_at`
(timestamptz; `started_at` defaults `now()` at insert alongside `created_at` — the two coincide at
creation but carry different meanings, business start time versus audit provenance, the same distinction
`created_by` already draws elsewhere; `completed_at` is null until the Attempt is completed and is set
exactly once); `created_at`, `updated_at` (the standard `touch_updated_at` trigger pattern).

`test_results`: `id`; `testing_attempt_id` (references `test_attempts`, cascades on Attempt deletion);
`test_case_id` (references `test_cases`, `on delete restrict` — safe forever, since Cases are only ever
soft-deleted, never removed as a row); unique on `(testing_attempt_id, test_case_id)`, one Result per Case
per Attempt; `test_case_title_snapshot` (text, not null), `test_case_description_snapshot`,
`test_case_preconditions_snapshot`, `expected_result_snapshot` (text, nullable) — all copied verbatim from
the Case at Attempt-creation time, extending the originally suggested schema, which omitted the
description and preconditions snapshots despite the Testing Execution Page needing to display both;
`test_case_steps_snapshot` (jsonb, not null, copied verbatim from `test_cases.steps` — no re-validation
against `test_case_steps_are_valid()` on write, since it's an internal copy of an already-valid array, not
user input); `outcome` (text, CHECK in `Not Run`/`Passed`/`Failed`/`Blocked`/`Skipped`, default `Not Run`
— named `outcome`, not `status`, per the vocabulary decision above); `notes` (text, nullable, trimmed
non-blank when present, ≤ 2000 characters, matching the length ceiling `test_cases`' own free-text fields
use); `executed_by` (references `auth.users`, `on delete restrict`, nullable — null until the first Result
is recorded, then whoever last saved it); `executed_at` (timestamptz, nullable, same lifecycle as
`executed_by`); `created_at`, `updated_at` (standard trigger pattern).

**Starting an Attempt is one transaction**: insert the `test_attempts` row, then bulk-insert one
`test_results` row per eligible Case (`build_id` match, `deleted_at is null`, any `status`) as it exists at
that instant. Nothing later grows this set — a Case added to the Build afterward is invisible to every
Attempt already in flight, per the "frozen at start" decision above. A Build with zero eligible Cases at
that instant is refused by the Server Action before either insert runs, matching the disabled state the
interface shows for the same reason.

**Authorization extends the existing bridge-function chain.** `test_attempts` reuses `build_project_id
(build_id)` directly, the same way `test_cases` does. `test_results` has no `build_id` of its own, so a
new function, `attempt_project_id(testing_attempt_id)` — `security definer`, `stable`, resolving through
`test_attempts.build_id` to `build_project_id()` — extends the chain one hop further, following ADR-0003's
established rule exactly (returns one scalar, nothing else; `execute` revoked from `public`/`anon`,
granted to `authenticated`). Every policy on both tables reduces to `is_project_member(...)`, with two
row-state exceptions, both encoded as ordinary RLS conditions rather than new machinery — this codebase
already has precedent for a role- or ownership-conditioned policy (`project_members`' own leave/remove
policies): `test_attempts`' DELETE policy adds `and status = 'In Progress'`, so a Completed Attempt is
undeletable, and its UPDATE policy's `using` clause is likewise `... and status = 'In Progress'`, which by
itself makes a Completed Attempt permanently un-updatable — including by whoever might try to "uncomplete"
it — with no separate reopening check needed.

**A Completed Attempt's Results are frozen by a trigger, not by RLS.** `test_results`' own RLS stays
uniformly simple — any Member, full stop, matching every table so far — and a `before update` trigger,
`freeze_test_result_if_attempt_completed()`, raises if the parent `test_attempts.status` is already
`Completed`. This mirrors how `test_cases` already keeps its own freeze rules (un-deleting, changing
provenance) in a trigger rather than in RLS, and keeps every policy in the phase legible as "is this
Member in the Project" alone.

**Routing** extends the existing `[buildId]` segment: `.../builds/[buildId]` (Build Details) gains a
Testing Attempts section. Starting an Attempt has no form to fill — it's a single action — so it skips a
`/new` page entirely: the Server Action creates the Attempt and its Results in one transaction and
redirects straight to `.../builds/[buildId]/attempts/[attemptId]/execute`, the Testing Execution Page.
`.../builds/[buildId]/attempts/[attemptId]` is the read-only Attempt Detail / Report, reachable regardless
of status; while an Attempt is in progress it additionally links to `/execute` to continue working it,
and hitting `/execute` on an Attempt that's already Completed redirects back to the read-only Detail page,
since the freeze trigger would refuse every write anyway.

**Data layer and Server Actions follow the `lib/test-cases` shape exactly**: `lib/test-attempts/{dal.ts,
limits.ts, messages.ts, validation.ts}`, `cache()`-wrapped reads gated by `verifySession()`, colocated
`actions.ts` files (start, record-result, complete, delete) each re-checking `requireProjectMembership`
server-side rather than trusting the page that rendered the form. `notes`'s length ceiling lives in
`limits.ts` alongside the unit test that keeps it matched to the migration's CHECK constraint, the same
discipline `lib/test-cases/limits.ts` already established.

**Recording a Result saves imperatively, not via full-page form submission** — the one genuinely new
interaction pattern this phase introduces. Clicking an Outcome calls the record-result Server Action
directly from a Client Component (no navigation, no full-page reload); notes are debounced roughly 500ms
after the last keystroke before the same Action is called, so free typing doesn't fire a request per
character. Both write paths update the same `test_results` row and are individually protected by the
freeze trigger, so a request that lands after an Attempt was completed mid-edit fails loudly rather than
silently succeeding.

**Design, per `DESIGN.md`.** This phase is the first to use the status-scale palette (§2) and the
components `DESIGN.md` names but defers building until now: the **Progress / Execution Bar** (§4) for the
"Tested: 18 / 25" plus per-Outcome breakdown, appearing on both the execution screen and the Attempt
Report; **Status Chips** (§4, fully pill-shaped, saturated leading dot) for both an Attempt's own status
(In Progress / Completed — outside the five-colour scale, since it's a lifecycle Status, not an Outcome)
and each Result's Outcome chip, drawn from the scale directly; the **primary button** treatment (§4) for
`▶ Record Attempt`; and the **Timeline** (§4) for the Testing Attempts section on Build Details, one
entry per Attempt. `DESIGN.md`'s own Timeline example assumes a single pass/fail verdict per entry, which
an Attempt doesn't have — it has a Status and a spread of Outcomes across its Results — so each entry's
medallion is adapted rather than copied literally: any Failed Result → the crimson cross; else any Blocked
or Skipped → amber; else, once Completed, all-Passed → the emerald check; while still In Progress →
Dormant Grey, the same token the Not Run Outcome itself uses, since the run's own agency hasn't concluded
yet. The execution screen follows §5's three-zone frame: the Progress Bar sits above a work surface
showing the current Case's full snapshot, Outcome buttons and notes field, with a context rail listing
every Case in the Attempt — its code and current Outcome chip — for jumping directly to any of them.

## Testing Decisions

**A good test here asserts what a Member could observe** — text and chips on screen, the URL landed on,
whether an Attempt or Result is reachable, what number was assigned, what a write is refused with — never
implementation shape.

**The same three seams Phases 1–3 already established, none new.**

*The browser is the primary seam.* End-to-end tests drive the real application against the real local
Supabase stack, split the way Phase 3 split Case coverage across purpose-built files:
`tests/e2e/testing-attempts.spec.ts` — starting an Attempt, seeing it appear in the Build's Testing
Attempts section with the right number and tester, the empty-build refusal, deleting an in-progress
Attempt, a Completed one being undeletable. `tests/e2e/attempt-execution.spec.ts` — moving through Cases,
recording every Outcome, editing notes, the progress indicator and Outcome breakdown updating live,
jumping directly to a Case out of order, completing an Attempt with Cases still Not Run, and a completed
Attempt's execution screen refusing further edits. `tests/e2e/attempt-report.spec.ts` — the read-only
report's progress, breakdown, individual Results, tester and timestamps, viewing an in-progress Attempt
read-only, and a non-member's 404. Prior art: `tests/e2e/test-cases.spec.ts` for the create-and-list
shape, `tests/e2e/test-case-details.spec.ts` for a details page assembled from several pieces of state,
`tests/support/test-cases.ts` and `tests/support/builds.ts` for the fixture-building helpers a
`tests/support/test-attempts.ts` should follow.

*Pure functions are the narrow second seam.* `tests/unit/test-result-validation.test.ts`, mirroring
`tests/unit/test-case-validation.test.ts`: notes' blankness and length rules, and that the valid-Outcome
set matches the migration's CHECK constraint, read from the same `limits.ts`/`messages.ts` modules the
constraint is generated to match.

*The database is the third seam, reached the way an attacker would.* `tests/rls/testing-attempts.test.ts`,
two real signed-in Users over the publishable key, mirroring `tests/rls/test-cases.test.ts`'s shape:
any Member can select, insert into and update `test_attempts` and `test_results`; a non-member gets
nothing and a `42501` on write; deleting a `test_attempt` succeeds while `status = 'In Progress'` and is
refused once `Completed`; updating a `test_attempt` is refused once `Completed` (covering both "complete
it twice" and "un-complete it"); updating a `test_result` succeeds while its parent Attempt is `In
Progress` and is refused — by the freeze trigger, not a policy — once the parent is `Completed`. One
addition beyond Phase 3's shape, exercising the new numbering decision the same way Phase 3's concurrency
test exercised `TC-nnn`: two simultaneous Attempt-starts on the same Build asserted to come back with
distinct `attempt_number`s.

**Deliberately not seams:** no mocked Supabase client, no isolated Server Action tests, no
component-level tests for the execution screen's debounced-notes behaviour — exercised through the browser
suite, the same discipline Phase 3 applied to its own steps builder.

## Out of Scope

- **Per-step results.** A Case's steps remain visible for context during execution, including any
  per-step expected result already on the snapshot, but only one Outcome is recorded per Case, not one per
  step.
- **A Case's own execution history on its Case Details page.** Case Details doesn't gain a "previous
  Results" section this phase; reviewing how a Case has fared lives on the Attempt Report, one Attempt at
  a time, not aggregated onto the Case.
- **Defects.** `CONTEXT.md` already names Defects as something a Project owns; recording one, or linking a
  Failed Result to one, is not part of this phase, consistent with the original brief's own scope.
- **Live/real-time collaboration.** Two Members recording Results on the same Attempt each see the other's
  changes only on their next load or action, not pushed live — the same last-write-wins model Phase 3
  already accepted for Cases, extended here without a realtime layer added on top.
- **Reopening a Completed Attempt, and restoring a deleted one.** Both are terminal actions this phase;
  ADR-0006 and the schema decisions above make both structurally impossible, not merely discouraged.
- **Configurable Outcome or Attempt-status values per Project.** Both sets are fixed for every Project,
  matching the same boundary Phase 3 drew for Case priority and status.
- **Attaching files or screenshots to a Result.** Notes are free text only.
- **Exporting or printing an Attempt Report.** It's a page in the product, not a generated document.
- **A cross-Build or cross-Release testing dashboard.** Progress and results are scoped to one Attempt or
  one Build at a time; nothing this phase aggregates across Builds.
- **Any deploy-related work.** No hosted Supabase project, no production URLs, no CI secrets — unchanged
  from every prior phase.

## Further Notes

**One ADR accompanies this spec**, already written: `docs/adr/0006-results-snapshot-their-case.md` records
why a Result copies its Case's fields instead of reading them live, names the rejected alternatives (a
live join; full Case versioning), and states the consequence that a bad snapshot can never be corrected in
place — only re-tested under a new Attempt.

**Vocabulary check before writing copy.** Read `CONTEXT.md`'s new Attempt and Result entries and its
"Status now names two different things" note first — all three were written as part of this spec's own
preparation, and the Outcome scale's naming (**Not Run**, not "Not Tested") corrects a wording that
appeared in early planning but conflicts with what `DESIGN.md` and Phase 3's own spec had already named.

**This is the phase `DESIGN.md`'s status scale and several of its components were written for.** The
Progress / Execution Bar, the Timeline, and the five-colour Outcome chips have sat named but unused in
`DESIGN.md` since it was written; this phase is where they render for the first time. Phase 3 ended by
naming exactly this as the next thing a Build still doesn't do — recording what happened when its Cases
were actually run — and this spec is that answer.
