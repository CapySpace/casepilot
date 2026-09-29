# Phase 3 — Shared Test Case Management

Status: ready-for-agent

## Problem Statement

A Build in CasePilot records only what was tested — a number, a description — never what needs to be
tested. `app/projects/[projectId]/releases/[releaseId]/builds/[buildId]/page.tsx` says so plainly: "Test
cases are not here yet." A team testing Build 100 has nowhere in CasePilot to write down the things they
mean to verify, nowhere to see what a colleague already wrote down, and nowhere to say "this one's ready
to run, that one's still a draft." Every later phase — recording an attempt, a pass or fail, a defect —
needs something to attach to, and today a Build is a dead end.

## Solution

A Build now holds Cases — `Project → Release → Build → Case` — matching how QA teams already think about
scope: a specific, testable artefact and the list of things to check on it. Any Member of a Project can
write a Case under a Build, give it a title, preconditions, an ordered list of steps and their expected
results, a priority and a status, and any other Member can read it, edit it, or remove it — no approval,
no ownership gate, the same shared-editing model Phase 2 already established for Releases and Builds.

A Case belongs to the Build it was written for. Testing the next Build means writing (or, later,
copying — deliberately not this phase, see Out of Scope) Cases again; nothing carries forward
automatically. This corrects `CONTEXT.md`'s earlier definition of Case as belonging to a Project — see
ADR-0005.

Build Details gains a real Test Cases section: every Case belonging to it, searchable and filterable by
title, status and priority, with a way to add a new one. Opening a Case shows its full definition — steps
and all — with Edit and Delete (behind a confirmation) for any Member.

## User Stories

### Creating a Case

1. As a Member of a Project, I want to create a Case under a Build, giving it a title, so that there's a record of a specific thing to verify.
2. As a Member, I want to give a Case an optional description, so that a colleague opening it later understands its purpose beyond the title.
3. As a Member, I want to give a Case optional preconditions, so that whoever runs it later knows what must already be true before they start.
4. As a Member, I want to add an ordered list of steps to a Case, each describing an action to take, so that the Case can be followed exactly.
5. As a Member, I want to give an individual step its own expected result, so that a tester can check each action's outcome as they go, not only at the very end.
6. As a Member, I want to give the Case as a whole an overall expected result, so that there's a single summary of what "this passed" means.
7. As a Member, I want to set a Case's priority (Low, Medium, High or Critical) when I create it, so that testers know what to run first when time is short.
8. As a Member, I want a new Case to default to Draft status, so that an unfinished Case isn't mistaken for one that's ready to run.
9. As a Member, I want to create a Case with just a title and nothing else, so that I can stub one out quickly and fill in the rest later.
10. As a Member, I want to be stopped from creating a Case with an empty or whitespace-only title, so that the list does not fill with unnameable rows.
11. As a Member, I want a Case I've just created to appear immediately in its Build's Case list, so that creating one and finding it again is not two separate acts.
12. As a Member, I want each Case to be given a short, stable code (`TC-nnn`) at creation, unique within its Build, so that I can refer to it in conversation or a bug report.
13. As a Member, I want two Cases created in the same Build at nearly the same moment by different colleagues to still get two different codes, so that shared editing never produces a collision.

### The Case list

14. As a Member viewing a Build, I want to see every Case belonging to it, so that I know the full scope of what's being tested.
15. As a Member, I want each row in the list to show a Case's code, title, priority and status at a glance, so that I don't have to open each one to get an overview.
16. As a Member opening a Build with no Cases yet, I want an honest empty state explaining how to add one, so that I don't think the feature is broken.
17. As a Member, I want Cases belonging to Builds I'm not a Member of to be completely absent, so that the list can't be used to learn what other teams are testing.

### Searching and filtering

18. As a Member, I want to search a Build's Cases by title, so that I can jump straight to the one I'm thinking of.
19. As a Member, I want to filter a Build's Cases by status, so that I can see only what's Ready (or only what's still a Draft).
20. As a Member, I want to filter a Build's Cases by priority, so that I can focus on the Critical ones first.
21. As a Member, I want search and filters to combine, so that I can ask for "Critical, Ready" Cases containing a word, not just one condition at a time.
22. As a Member, I want a search or filter that matches nothing to say so plainly, so that I don't mistake "no matches" for "still loading."

### Case details

23. As a Member, I want to open a Case and see its title, description, preconditions and overall expected result in full, so that I know exactly what's being asked.
24. As a Member, I want to see every step in order, each with its own expected result if one was given, so that I can follow the Case exactly as written.
25. As a Member, I want to see a Case's priority and status clearly, so that I know how it fits into the Build's testing effort without cross-referencing the list.
26. As a Member, I want to see who created a Case and who last updated it, and when, so that I know who to ask if something's unclear.
27. As a Member, I want the URL to name the Project, Release, Build and Case I'm looking at, so that I can bookmark it, share it, and open two Cases in two tabs.

### Editing a Case

28. As a Member, I want to edit any field of a Case — title, description, preconditions, steps, expected result, priority, status — so that I can correct or refine it as testing understanding improves.
29. As a Member, I want to add, remove and reorder a Case's steps while editing, so that the Case can evolve without being recreated from scratch.
30. As a Member, I want the same validation rules when editing as when creating, so that I can't edit a Case into an invalid state.
31. As any Member — not only the one who created the Case — I want to edit it, so that keeping Cases current doesn't bottleneck on one person.
32. As a Member, I want my edit to be visible to other Members immediately, so that shared editing actually feels shared.
33. As a Member, I want the last save to win if two of us edit the same Case around the same time, without being blocked by a conflict warning, so that day-to-day editing stays frictionless.

### Deleting a Case

34. As a Member, I want to delete a Case that's no longer needed, so that the list doesn't accumulate stale entries.
35. As a Member, I want to be asked to confirm before a Case is actually deleted, so that a misclick doesn't destroy work.
36. As a Member, I want a deleted Case's code never to be reused by a later Case in the same Build, so that a code always refers to one thing, even after it's gone.
37. As any Member — not only the one who created it — I want to delete a Case, so that removing stale entries doesn't bottleneck on one person.

### Access control

38. As a Member, I want Case data reachable only by people in the Case's Project, enforced by the database, so that a bug in a page can't leak it.
39. As a non-member, I want a Case's URL to tell me nothing — not even that it exists — so that identifiers can't be used to map other teams' work.
40. As a User, I want the API to refuse what the interface refuses, so that calling Supabase directly isn't a way round membership.
41. As a Member, I want a Case reached by its own id under the wrong Build to be treated as not found, so that a stale or guessed link can't show me the wrong Case dressed up as the right one.

## Implementation Decisions

**Vocabulary is settled in `CONTEXT.md` and ADR-0005.** Case now belongs to a Build, not a Project;
`TC-nnn` is unique within its Build, not the Project. `CONTEXT.md`'s Build entry and the `projects`
migration's own comments have already been corrected to match.

**Schema: one new table, `test_cases`.** `id`; `build_id` (references `builds`, cascades on Build
deletion); `code` (text, e.g. `TC-003` — a per-Build sequence assigned atomically at insert time under a
row lock scoped to `build_id`, never computed as "count of existing Cases plus one" in application code,
because two Members creating a Case in the same Build at the same moment is exactly the scenario shared
editing is designed around; unique on `(build_id, code)` including soft-deleted rows, so a code is never
reissued); `title` (text, trimmed non-blank, 1–200 characters); `description`, `preconditions`,
`expected_result` (text, nullable, trimmed non-blank when present, ≤ 2000 characters each); `steps`
(jsonb, default `[]`, CHECK-constrained to an array of at most 50 objects, each with a required
non-blank `action` of 1–500 characters and an optional `expectedResult` of ≤ 500 characters — order is
the array's own position, no separate ordinal column); `priority` (text, CHECK in `Low`/`Medium`/`High`/
`Critical`, default `Medium`); `status` (text, CHECK in `Draft`/`Ready`/`Deprecated`, default `Draft`);
`created_by`, `updated_by` (both reference `auth.users`, `on delete restrict`, provenance only —
`updated_by` starts equal to `created_by` and changes on every subsequent edit); `created_at`,
`updated_at` (trigger-maintained, the same `touch_updated_at` pattern `projects` and `releases` already
use); `deleted_at` (timestamptz, nullable — a Case is soft-deleted by setting this, never removed as a
row).

**Delete is an UPDATE, not a Postgres DELETE.** There is no DELETE policy on `test_cases` at all — hard
deletion is impossible via the API, the same "refuse by absence of policy" discipline Phase 2 used for
Releases and Builds. "Deleting" a Case sets `deleted_at`, permitted by the same full-membership UPDATE
policy as any other edit. A freeze trigger, extending the provenance-freeze pattern from `projects`,
stops `id`, `build_id`, `code`, `created_by` and `created_at` from ever changing, and additionally stops
`deleted_at` from being un-set or changed once written — a delete is terminal this phase; there is no
restore.

**Reads exclude soft-deleted Cases at the data-layer, not the RLS layer.** Row-level security continues
to decide membership-visibility only, per the discipline `lib/builds/dal.ts` and `lib/releases/dal.ts`
already state for themselves; every read in `listTestCases`/`getTestCase`-equivalent functions adds its
own explicit `deleted_at is null` filter, the same way they already add an explicit `build_id` match
beyond what RLS alone would return.

**Authorization: a new bridge function, full CRUD for any Member.** `builds` has no `project_id` column,
so a `build_project_id(build_id)` function (mirroring `release_project_id` from Phase 2's ADR-anticipated
pattern) resolves a Build to its Project through its Release, and every policy on `test_cases` is
expressed as `is_project_member(build_project_id(build_id))`. Unlike Builds — create-and-view only —
`test_cases` gets select, insert and update policies with no Owner-only gate anywhere, matching this
phase's explicit "Project members can create, edit, and delete test cases directly" requirement.

**Data layer and Server Actions follow the `lib/builds` shape exactly**: a `dal.ts` for reads
(`verifySession`, `cache`-wrapped, typed camelCase results mapped from snake_case rows, `notFound()` on a
missing or wrong-Build Case), and colocated `actions.ts` files for creation, update and the soft-delete,
each re-checking `requireProjectMembership` against the posted `projectId` rather than trusting the page
that rendered the form — the same reasoning `createBuild`'s and `updateRelease`'s own comments give.
Validation, length limits and user-facing messages get their own modules mirroring `lib/builds/limits.ts`,
`validation.ts` and `messages.ts`, so the DB CHECK constraints, the form's own validation, and the copy a
Member sees all read from the same numbers.

**Routing** extends the existing `[buildId]` segment: `.../builds/[buildId]` (Build Details) gains the
Test Cases section; `.../builds/[buildId]/test-cases/new` is a full-page Create form, matching the
`/projects/new`-style precedent Phase 2 chose over a dialog for creation; `.../builds/[buildId]/
test-cases/[testCaseId]` is Case Details; `.../builds/[buildId]/test-cases/[testCaseId]/edit` is a
dedicated Edit page reusing the same form component as Create — unlike Release editing, which stayed
inline on its Details page, a Case's form (title, four text fields, an ordered steps builder,
priority/status selects) is substantial enough that a details page hosting it inline would stop being a
details page.

**Search and filter are client-side**, extending the `release-search-context.tsx` pattern: a Context
holds the Build's already-fetched Case list plus a text query, a status filter and a priority filter, and
derives the visible rows by combining all three — no server round-trip per keystroke, consistent with
list sizes at this scale and with how Releases already search.

**Steps are reordered with up/down controls, not drag-and-drop.** No sortable/dnd library is installed
anywhere in this codebase; adding one for a single form is a new dependency for a feature list lengths
don't demand.

**Design tokens, per `DESIGN.md`.** `TC-nnn` gets the monospace identifier treatment and Navigational
Sapphire link colour `DESIGN.md` already names for it explicitly (`TC-101` is its own worked example).
**Priority and Status are deliberately not drawn from the saturated status-scale palette.** That palette
(`DESIGN.md` §2, emerald/crimson/amber/violet/grey) is reserved for the five *execution* verdicts —
Passed, Failed, Blocked, Skipped, Not Run — arriving in Phase 4; a Case's own `Draft`/`Ready`/`Deprecated`
lifecycle and its `Low`/`Medium`/`High`/`Critical` priority are different axes entirely, and colouring
either from that scale would let a green chip mean two unrelated things depending on which page it's on —
exactly the decorative-colour drift `DESIGN.md`'s central discipline exists to prevent. Both render as
plain pill chips in Whisper Periwinkle with Midnight Slate Navy or Muted Harbour Slate text — visually
present, never a verdict colour. The list keeps the established plain `<ul>`/`<li>` rounded-card row
pattern Releases and Builds already use, not a `Table` primitive, for the same visual consistency reason
Phase 2 chose it. The "New Test Case" button label matches `DESIGN.md`'s own secondary-button worked
example (§4) exactly.

**Two existing placeholders are corrected**, following the honest-empty-state discipline Phase 2 already
practised on itself: Build Details' "Test cases are not here yet" card is replaced by the real Test Cases
section, and the Project Overview's "Test cases arrive next" sentence is updated to describe what a
Project now holds in full, with nothing left unbuilt to name.

## Testing Decisions

**A good test here asserts what a Member could observe** — text on screen, the URL landed on, whether a
Case is reachable, what code was assigned — never implementation shape.

**The same three seams as Phase 1 and 2, none new.**

*The browser is the primary seam.* End-to-end tests drive the real application against the real local
Supabase stack: creating a Case with and without steps, seeing it in the list with its code, opening
Details, editing every field including reordering and removing steps, deleting with the confirmation
step, searching and filtering (alone and combined), the empty states, validation failures, and a
non-member's 404. Prior art: `tests/e2e/builds.spec.ts` is the direct template for the create/list/
details shape; `tests/e2e/project-members.spec.ts` for a confirmation-gated destructive action.

*Pure functions are the narrow second seam.* Title/description/preconditions/expected-result length and
blankness rules, and the `steps` array's own shape validation (non-blank `action`, the 50-step ceiling),
get unit tests mirroring `tests/unit/build-validation.test.ts` — including that test's own discipline of
reading the limits from the same module the migration's CHECK constraints are generated to match, so the
two can't silently drift apart.

*The database is the third seam, reached the way an attacker would.* A `tests/rls/test-cases.test.ts`
suite, two real signed-in Users over the publishable key, asserting: any Member (not only the creator)
can select, insert into and update `test_cases`; a non-member gets nothing and a `42501` on write;
deleting is refused outright as a Postgres `DELETE` (no policy exists) while succeeding as an UPDATE
setting `deleted_at`; and a `deleted_at` already set cannot be un-set or edited further. (The
"reached by its own id under the wrong Build" check has no RLS-layer equivalent here — row-level
security only knows project membership, not which Build a Case is supposed to be under — so that check
belongs to the data layer instead, exercised by the browser suite once Case Details exists.) One
addition beyond Phase 2's shape: a concurrency test firing two simultaneous inserts under the same Build
and asserting the two rows come back with distinct codes — the test that actually exercises the atomic
numbering decision, not just its intent.

**Deliberately not seams:** no mocked Supabase client, no isolated Server Action tests, no
component-level tests for the steps builder — its add/remove/reorder behaviour is exercised through the
same browser tests as the rest of the form.

## Out of Scope

- **Reusing or copying Cases across Builds.** A Case belongs to one Build; there is no "case library,"
  no template, no bulk-copy into a new Build. ADR-0005 names this as the deliberate boundary and the
  likely shape of a future feature — `DESIGN.md`'s own "Copy Cases from Build…" button example (§4) is
  exactly that future feature's placeholder, not something this phase builds.
- **Recording test execution or results of any kind.** Pass/fail, attempts, the status-scale colours,
  defects — all of Phase 4, as the original spec states outright.
- **Restoring a deleted Case.** Deletion is soft (the row survives) but terminal from the interface's and
  the database's point of view alike — no undo, no trash view, this phase.
- **Optimistic-concurrency conflict detection.** Two Members editing the same Case near-simultaneously
  produce a plain last-write-wins outcome; no version check, no "someone else edited this" warning.
- **Configurable priority or status values.** Both sets are fixed for every Project; there is no
  per-Project taxonomy.
- **Any filter beyond title, status and priority** — no filtering by creator, date, or step content.
- **Manual reordering of Cases within a Build's list**, and **duplicating an existing Case.** Neither
  was asked for; the list sorts by creation order with sortable columns, nothing more.
- **Project-level roles beyond Owner and Member.** Case access is uniformly Member-and-above, matching
  the scope boundary Phases 1 and 2 already established.
- **Anything deploy-related.** No hosted Supabase project, no production URLs, no CI secrets — unchanged
  from every prior phase.

## Further Notes

**One ADR accompanies this spec**, already written: `docs/adr/0005-cases-belong-to-a-build.md` records
why Cases are Build-scoped rather than Project-scoped, and names the rejected alternative (a Project-level
reusable Case library) explicitly, so it isn't quietly "fixed" back to the old `CONTEXT.md` wording later.

**Vocabulary check before writing copy.** Read `CONTEXT.md`'s Case and Build entries first — both were
just corrected as part of this spec's own preparation, and the Build entry now cross-references ADR-0005.

**This phase is what finally makes a Build worth opening.** Phase 2 ended by saying exactly that nothing
was there yet to test with; this phase is the answer, and Phase 4 — recording what happened when those
Cases were actually run — is the next thing a Build still doesn't do.
