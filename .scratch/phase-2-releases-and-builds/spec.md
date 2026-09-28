# Phase 2 — Release and Build Management

Status: ready-for-agent

## Problem Statement

A Project in CasePilot can hold people, and nothing else. `app/projects/[projectId]/page.tsx` says so
plainly: "Nothing to test here yet." There is nowhere to record that a team is testing version `1.0.0`
of their software, nowhere to say which CI build a tester is looking at when they file a defect, and no
way to tell one build of a release from another. Every later phase — recording a test attempt, filing a
defect against a build, showing an execution history — needs something to attach to, and today nothing
exists below Project.

## Solution

A Project now holds Releases, and each Release holds the Builds produced under it — `Project → Release →
Build`, matching how QA teams already think about their software (`v1.0.0`, and the CI builds `100`,
`101`, `102` produced while testing it). Any Member of a Project — not only its Owner — can create a
Release, edit its version, name and description, and add Builds under it by build number. Builds are
recorded, not edited: once a build number is logged it stands as the record of what was tested.

The Project's sidebar gains a Releases entry. Opening it lists every Release in the Project; opening a
Release shows its details alongside every Build recorded under it; opening a Build shows its details and
says plainly that test cases are not here yet, because they are not — that arrives in Phase 3. Access to
all of it is decided by the same database-enforced membership check Phase 1 built for Projects: a
non-member's request for a Release or Build gets the same answer as one for a Release that never existed.

## User Stories

### Creating a Release

1. As a Member of a Project, I want to create a Release with a version, so that I have somewhere to record the Builds produced for it.
2. As a Member, I want to give a Release an optional description, so that colleagues opening it later know what changed.
3. As a Member, I want to give a Release an optional name in addition to its version, so that a milestone can carry a human-readable label if the team wants one.
4. As a Member, I want to be stopped from creating a Release with an empty or whitespace-only version, so that the list does not fill with unnameable rows.
5. As a Member, I want to be stopped from creating a second Release with the same version already used in this Project, so that the list is never ambiguous about which `1.0.0` is meant.
6. As a Member, I want the same version stated in two different Projects to cause no conflict, so that my Project's version numbering is not constrained by anyone else's.
7. As a Member who has just created a Release, I want to land on its details, so that creating one and starting to add Builds to it is one motion.

### The Release list

8. As a Member of a Project, I want to see every Release belonging to it, so that I have one place to find the version I am working with.
9. As a Member, I want each Release to show how many Builds it holds, so that I can tell at a glance which ones have testing activity.
10. As a Member of a Project with no Releases yet, I want the empty list to explain what to do, so that a first visit is not a dead end.
11. As a Member, I want Releases belonging to Projects I do not belong to to be completely absent, so that the list cannot be used to learn what other teams are working on.

### Release details

12. As a Member, I want to open a Release and see its version, its name if one was given, and its description, so that I know exactly what I am looking at.
13. As a Member viewing a Release, I want to see every Build recorded under it, so that I can find the one a colleague is asking about.
14. As a Member opening a Release with no Builds yet, I want an honest empty state explaining how to add one, so that I do not think the Release is broken.

### Editing a Release

15. As a Member, I want to edit a Release's version, name and description, so that a typo or a milestone slip can be corrected without recreating it.
16. As a Member, I want the same validation rules when editing as when creating, so that I cannot edit a Release into an invalid state.
17. As a Member, I want to be stopped from editing a Release's version into one already used elsewhere in the Project, so that editing cannot create the ambiguity creation already prevents.
18. As any Member — not only the Project's Owner — I want to edit a Release, so that keeping release metadata current does not bottleneck on one person.

### Creating a Build

19. As a Member, I want to add a Build under a Release, recording its build number, so that I have a specific, testable artefact of that Release on record.
20. As a Member, I want to give a Build an optional description, so that a colleague opening it later has context beyond the bare number.
21. As a Member, I want to be stopped from creating a Build with an empty or whitespace-only build number, so that the list does not fill with unidentifiable rows.
22. As a Member, I want to be stopped from creating a second Build with the same number already used under this Release, so that the list is never ambiguous about which "Build 100" is meant.
23. As a Member, I want the same build number used under two different Releases to cause no conflict, so that CI's own numbering scheme is not constrained by CasePilot's.
24. As a Member who has just created a Build, I want it to appear immediately in its Release's Build list, so that creating one and finding it again is not two separate acts.

### The Build list

25. As a Member viewing a Release, I want to see every Build recorded under it, in a useful order, so that I can find the one I need without hunting.
26. As a Member, I want Builds belonging to Releases I cannot see to be completely absent, so that the same database-enforced boundary that protects Releases protects Builds.

### Build details

27. As a Member, I want to open a Build and see its number and description, so that I know exactly what artefact I am looking at.
28. As a Member opening a Build, I want to be told plainly that test cases are not here yet, so that I do not think the product is broken — the same honesty the Project Overview already shows about Releases and Builds themselves.
29. As a Member, I want the URL to name the Project, Release and Build I am looking at, so that I can bookmark it, share it with a colleague, and open two Builds in two tabs.

### Navigation

30. As a Member, I want a Releases entry in the Project's persistent sidebar, so that reaching it does not mean hunting for a link.
31. As a Member browsing a Release or a Build, I want to see and use the path back up to the Project, so that I always know where I am inside the hierarchy and can return to it in one action.
32. As a Member on the Project Overview, I want it to stop claiming Releases and Builds are not here, now that they are, so that the Overview page tells the truth about the Project's current state.

### Access control

33. As a Member, I want Release and Build data reachable only by people in the Project, enforced by the database, so that a bug in a page cannot leak it.
34. As a non-member, I want a Release's or a Build's URL to tell me nothing — not even that it exists — so that identifiers cannot be used to map other teams' work.
35. As a User, I want the API to refuse what the interface refuses, so that calling Supabase directly is not a way round membership.
36. As any Member, I want to be able to create Releases and Builds, and edit Releases, without needing Owner status, so that day-to-day QA record-keeping does not bottleneck on the one person who happens to hold that Role.

## Implementation Decisions

**Vocabulary is settled in `CONTEXT.md`.** *Release* and *Build* are now defined terms: a Release is a
named version or milestone (`1.0.0`) holding the Builds produced under it; a Build is a specific,
testable build produced under a Release, identified by an externally-assigned build number (`100`), not
one CasePilot mints. `Project`'s own definition changes from "owns Cases, Builds and Defects" to "owns
Releases and Defects" — Builds are now reached through their Release, not listed as a direct child of
Project. Case's eventual home in this hierarchy is explicitly left for Phase 3.

**Schema: two new tables.** `releases` — `id`, `project_id` (references `projects`, cascades on Project
deletion), `version` (text, trimmed non-empty, 1–100 characters), `name` (text, nullable, trimmed
1–100 characters when present), `description` (text, nullable, ≤ 500 characters), `created_by`
(references `auth.users`, `on delete restrict`, provenance only — never consulted for permission, per
the Phase 1 precedent), `created_at`, `updated_at`. `builds` — `id`, `release_id` (references
`releases`, cascades on Release deletion), `build_number` (text, trimmed non-empty, 1–100 characters),
`description` (text, nullable, ≤ 500 characters), `created_by`, `created_at`, `updated_at`. Uniqueness:
`(project_id, version)` on `releases` and `(release_id, build_number)` on `builds`, both case-sensitive
— a version or build number is authored by the team, not an identity key, so normalising case is solving
a collision that has not shown up in practice. `updated_at` is trigger-maintained on both tables, the
same pattern `projects` already uses.

**Authorization reuses `is_project_member` outright — no new predicate.** Every policy on `releases` and
`builds` is expressed through the existing `security definer` function from ADR-0003, exactly as that
ADR anticipated ("Releases, Builds, Cases and attempts all arrive needing the same predicate"). Unlike
`projects`, there is no `is_project_owner`-gated policy anywhere in this phase: any Member may select,
insert and update both tables. There is deliberately no delete policy on either table — delete is out of
scope (see below), and the absence of a policy is what enforces that under row-level security's
default-deny, rather than an application-level check that could be bypassed by calling the API directly.

**Builds are create-and-view only.** The Core Functions this phase specifies list Create, View builds and
View build details for Build — never Edit. `builds.description` is therefore write-once at creation;
no update path is built for it, even though the column exists and its `updated_at` trigger is present
for schema consistency. This is a deliberate asymmetry with Release, not an oversight: a build number is
a record of what was tested, and changing it after the fact is a different feature (correcting a
mis-logged build) that has not been asked for.

**Routing follows the existing `[projectId]` convention.** `/projects/[projectId]/releases` lists
Releases (the screen already captured as `.stitch/designs/project-releases.html`, screen id
`995ea989e41942fcbd426177db942a5c`, currently `implementedBy: null` in `.stitch/metadata.json`);
`/projects/[projectId]/releases/[releaseId]` is Release Details plus its Build list;
`/projects/[projectId]/releases/[releaseId]/builds/[buildId]` is Build Details. Release and Build
creation are full-page forms, matching the existing `/projects/new` pattern rather than a dialog —
consistent with how Phase 1 reserved the `alert-dialog` component for destructive confirmations, not
creation. Editing a Release happens inline on its Details page: there is no Owner/Member asymmetry to
gate behind a separate Settings-style route, so a dedicated edit surface would be a route for no reason.

**The Releases entry joins the Project sidebar**, and the comment in `project-nav.tsx` stating that
"Releases, Builds and Cases arrive in the next phase" is corrected — Releases and Builds are no longer
future tense. The Project Overview's card stating the same thing is updated to name only what is still
missing: test cases, arriving in Phase 3. This mirrors the honest-empty-state discipline that page
already practises rather than introducing a new pattern.

**Design tokens are not optional**, per `DESIGN.md`. The Release and Build list/detail pages reuse the
existing Card, Button and Input primitives from `components/ui/`, the established status-scale
discipline (colour means status and status alone — a Release or Build has no status of its own this
phase, so none of the emerald/crimson/amber/violet scale appears here), and the monospace treatment
`DESIGN.md` already specifies for identifiers, extended to build numbers and release versions
consistently with how it already applies to case IDs and version refs. The Stitch mock's own colours,
nav labels ("Team & Invites", "Project Settings") and search box are reference only, per
`.stitch/README.md` — the shipped screen follows `DESIGN.md`'s tokens and this repository's actual nav
labels ("Members", "Settings"), not the mock's.

## Testing Decisions

**A good test here asserts what a Member could observe** — text on screen, the URL landed on, whether a
Release or Build is reachable — never implementation shape. This is unchanged from Phase 1's discipline
and from the direct-API suite's own rule that raw API responses are read only because the API response
*is* the observable behaviour being specified there.

**Three seams, all with prior art in this repository, none new.**

*The browser is the primary seam.* End-to-end tests drive the real application against the real local
Supabase stack: creating a Release and a Build, seeing them listed, seeing the empty states, editing a
Release, validation failures for both entities, the uniqueness-collision messages, and the honest
"Test cases arrive in Phase 3" copy on Build Details. Prior art: `tests/e2e/projects.spec.ts` and
`tests/e2e/project-members.spec.ts` are the closest analogues — a tenant-scoped entity, its list, its
detail page and its edit form, all driven through the browser.

*Pure functions are the narrow second seam.* Validation rules for `version`, `release name` and
`build_number` (trim, length, non-empty) get unit tests where the browser would be uneconomical to
exercise for every boundary case, mirroring `tests/unit/project-validation.test.ts`.

*The database is the third seam, reached the way an attacker would.* A `tests/rls/releases-and-builds`
suite, shipped in the schema ticket rather than a later one, talks to Supabase over the publishable key
as two real signed-in Users and asserts that a User in Project A cannot select, insert into, or update
Project B's `releases` or `builds` — including reaching a Build through its Release's `id` directly,
not only through the Project. Prior art: `tests/rls/projects.test.ts` and `tests/rls/members.test.ts`
are the direct template; this suite is smaller because there is no Owner-only policy to test separately
from the Member-only one — every write policy in this phase is the same predicate.

**Deliberately not seams:** no mocked Supabase client, no isolated Server Action tests, no
component-level tests — unchanged from both prior phases.

## Out of Scope

- **Deleting a Release or a Build.** No policy, no affordance, no route. A mis-created Release or Build
  stands until a later phase adds a way to remove it — the same shape of gap Phase 1 left open for
  Project deletion, accepted for the same reason: nothing has data riding on it yet.
- **Editing a Build after creation.** The Core Functions this phase specifies never list it; a build
  number is a record of what was tested, not a value to revise.
- **Search, sorting, pagination or filtering** of Releases or Builds. The Stitch mock's search box is
  reference only — deferred for the same reason Phase 1 deferred it for Projects and Members: a list is
  a list at this size.
- **Release name shown prominently in the interface.** The field is stored and editable, but the Stitch
  screen and this phase's list/detail views key everything off version; surfacing name more visibly is
  a later design decision, not this one.
- **Semver enforcement, or any structural validation of `version` or `build_number`** beyond
  non-empty and length. Teams version software however they choose.
- **Project-level roles beyond Owner and Member**, and any per-feature permission model — Release and
  Build access is uniformly Member-and-above, matching Phase 1's existing scope boundary.
- **Anything execution-related**: pass/fail status, the status scale, attempts, defects, and Case
  itself. All of Phase 3.
- **Notifying anyone** of a Release or Build being created or edited.
- **Anything deploy-related.** No hosted Supabase project, no production URLs, no CI secrets — unchanged
  from both prior phases.

## Further Notes

**No ADR accompanies this spec.** Every decision here extends precedent Phase 1 already justified —
predicate reuse was anticipated by name in ADR-0003, routing follows the existing convention, and the
Member-not-Owner authorization call is reversible at the policy level without touching the schema. None
of it clears the hard-to-reverse-and-surprising bar an ADR is for.

**The Stitch screen this phase implements already exists as a committed record**
(`.stitch/designs/project-releases.html`, `.png`, and its entry in `.stitch/metadata.json`) — read
`.stitch/README.md` before treating anything in that snapshot as more than a reference the shipped page
is checked against, not copied from.

**Vocabulary check before writing copy.** Read `CONTEXT.md` first — it now defines *Release* and
*Build* precisely, and *Project*'s own definition has changed to route Builds through Release rather
than listing them as a direct child.

**This phase's own seam is thin, on purpose, echoing Phase 1's note about itself.** At the end of this
work, a Member can organise their testing around versions and builds — and there is still nothing to
*test* with them. That is correct: Phase 3 is what makes a Build worth opening.
