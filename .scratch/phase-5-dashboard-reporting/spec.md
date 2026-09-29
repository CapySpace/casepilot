# Phase 5 — Dashboard, Reporting, and Test Analytics

Status: ready-for-agent

## Problem Statement

Phase 4 gave CasePilot a full record of testing — Attempts and the Results recorded within them — but
nowhere to see that record summarized. Today, knowing whether Build 120 is actually ready means opening
its Attempts one at a time and counting Outcomes by eye. A Member joining mid-project has no single
place to ask "how is this Build doing," no way to see just the Failed and Blocked Cases that need
attention without scanning past everything that passed, and no view of who on the team has actually been
testing. Phase 4's own spec named this gap directly and deliberately left it out of scope: "a cross-Build
or cross-Release testing dashboard." This phase is that dashboard.

## Solution

Every Build gains a Report: its live progress, an Outcome breakdown, a focused list of Failed and Blocked
Cases, its most recent Results, and who recorded them — all computed from the Attempts and Results that
already exist, with no new statistics tables. A Release gains a Summary: the same numbers for each of its
Builds, laid out as a breakdown rather than a single blended total, since Cases belong to one Build and
don't carry over to the next (ADR-0005) — two Builds under a Release can hold entirely unrelated Cases,
so summing them would misrepresent what's actually being measured. A Project's own page becomes its
Dashboard: the current Build's Report, front and center, with pickers to look at another Release or Build.

A Case can be worked by more than one Attempt, so every number on these pages is computed from each
Case's *latest* Result — the most recent Attempt that reached it — never blended across Attempts and
never falling back to an older verdict once a newer Attempt supersedes it. A Case no Attempt has ever
reached is reported as **Not Tested**, a dashboard-only distinction from the existing **Not Run** Outcome
(a Result exists; nobody has recorded a verdict in it yet) — the five Outcomes stay exactly as `CONTEXT.md`
already names them, and this phase adds no sixth one to that enum.

## User Stories

### Build Report

1. As a Member, I want a Build's own Report page, so I can see its testing state without opening every
   Attempt one at a time.
2. As a Member, I want the Report to show the Build's total Case count, so I know the scope of what's
   being tested.
3. As a Member, I want the Report to show how many of the Build's Cases have been Tested versus Not
   Tested, so I can see how much work remains.
4. As a Member, I want a completion percentage (Tested Cases ÷ total Cases), so I have one number that
   answers "are we done."
5. As a Member, I want a breakdown of Passed, Failed, Blocked, and Skipped counts among Tested Cases, so
   I know not just how much is done but how it's going.
6. As a Member, I want a pass rate (Passed ÷ Tested), so I know how healthy the testing that has happened
   actually is, independent of how much is left.
7. As a Member, I want each Case's reported status to reflect its *latest* Result — the most recent
   Attempt that reached it — so re-testing a Case supersedes what an earlier Attempt found rather than
   sitting alongside it.
8. As a Member, I want a Case reached by an Attempt that's still in progress to already count toward the
   Report's numbers, so progress is live rather than waiting for someone to mark the Attempt Completed.
9. As a Member, I want a Case whose latest Attempt hasn't reached it yet to show as Not Run — never
   silently falling back to what an older, superseded Attempt found for that Case — so the Report never
   claims a verdict that hasn't actually been given by the run that matters now.
10. As a Member, I want a Case that no Attempt has ever reached to be reported as Not Tested, distinct
    from Not Run, so "nobody has looked at this yet" and "someone looked and hasn't given a verdict" read
    as the two different situations they are.
11. As a Member, I want only Ready Cases counted toward the Report's totals, so a Draft Case nobody
    intends to test yet, and a Deprecated one nobody intends to test anymore, don't inflate "Not Tested."
12. As a Member, I want a Case that was tested, found Failed, and only later marked Deprecated to still
    appear in the Failure Overview, so a real bug doesn't quietly vanish from view just because the Case's
    own lifecycle moved on — even though it no longer counts toward the totals.
13. As a Member opening the Report for a Build with no Ready Cases yet, I want an honest empty state
    rather than a division-by-zero or a blank chart, so I understand why there's nothing to show.
14. As a Member, I want the Report's summary numbers to always reflect the Build's true, current state,
    unaffected by whatever filter I've applied to the lists further down the page, so the top-line numbers
    are always something I can trust at a glance.

### Failure Overview

15. As a Member, I want a focused list of the Build's Failed and Blocked Cases, so I can go straight to
    what needs investigation without scanning past everything that passed.
16. As a Member, I want Failed and Blocked Cases visually distinguished from each other in that list — not
    merged into one undifferentiated "problem" bucket — so I know which is which without opening each one.
17. As a Member, I want to narrow that list to just Failed, just Blocked, or both, so I can focus on one
    kind of problem at a time.
18. As a Member, I want each row in the list to show enough to act on — the Case's code and title, its
    Outcome, who recorded it, and when — so I don't have to open every one just to triage.
19. As a Member, I want to open a Case from that list straight through to the Attempt Result that produced
    it, so I can read the full notes and snapshot behind the verdict.

### Recent Results and Tester Activity

20. As a Member, I want to see the Build's most recently recorded Results, so I know what's happened
    lately without opening the newest Attempt directly.
21. As a Member, I want a Tester Activity view of who recorded what, on which Case, with what Outcome, and
    when, so I can see the team's actual testing activity, not just the Cases themselves.
22. As a Member, I want Tester Activity to reflect Results being recorded specifically, not just Attempts
    being started or completed, so it answers "who found what," which a bare Attempt-level event can't.
23. As a Member, I want a Result recorded by someone who has since left the Project to still appear in
    Tester Activity, attributed honestly (their name if still resolvable, an honest placeholder if not),
    so leaving a Project doesn't rewrite the Build's testing history.
24. As a Member, I want to filter Tester Activity and Recent Results by tester, Outcome, and a date range,
    so I can answer narrower questions like "what did Priya find this week."

### Release Summary

25. As a Member, I want a Release's own Summary page, so I can see the state of testing across every Build
    produced under it.
26. As a Member, I want that Summary to list each Build's own numbers separately, not blended into one
    Release-wide total, so I'm never shown a number that quietly averages two Builds' unrelated sets of
    Cases together.
27. As a Member, I want the Release's most recently produced Build called out as the current one, so I
    know which row to look at first.
28. As a Member, I want to open any Build in that list straight through to its own Report, so the Summary
    is a way in, not a dead end.
29. As a Member opening a Release with no Builds yet, or whose Builds have no Ready Cases yet, to see an
    honest empty state rather than an empty or broken chart.

### Project Dashboard

30. As a Member, I want a Project's own page to open on the current Report — the most recent Build of the
    most recently produced Release — so I land on the number I almost always came to check, without
    picking anything first.
31. As a Member, I want to switch which Release and Build I'm looking at from the Dashboard, so I can
    check an earlier Build's state without leaving the page.
32. As a Member opening a Project with no Releases, or no Builds, or no Ready Cases yet, to see an honest
    empty state that explains what's missing and where to go add it, matching the same discipline every
    other empty state in the product already follows.

### Visualizing progress

33. As a Member, I want the Outcome breakdown shown as a proportional bar segmented by status colour, so
    I can see the shape of the Build's results at a glance, not just read five separate numbers.
34. As a Member, I want that bar's colour to follow the same status scale as everywhere else in the
    product — Passed emerald, Failed crimson, Blocked and Skipped amber-family, Not Run dormant grey — so
    a colour never means something different on the Report than it does on the execution screen.
35. As a Member, I want a completion progress indicator distinct from the Outcome bar, so "how much is
    done" and "how it went" are two things I can read independently.

### Access control

36. As a Member, I want to view any Report, Summary, or Dashboard belonging to a Project I've joined, so
    every current Member has the same visibility into testing progress.
37. As a non-member, I want a Project's Dashboard, a Release's Summary, or a Build's Report to tell me
    nothing — not even that the Project, Release, or Build exists — so identifiers can't be used to map
    other teams' testing progress.
38. As a Member, I want these pages to only ever be able to show Results recorded by people who were
    Project Members at the time, enforced by the database, so a bug in a page can't leak another
    Project's testing data into mine.
39. As a User, I want the filters on these pages (release, build, Outcome, tester, date) to only ever
    narrow what I can already see as a Member, never widen it, so a filter can't be used to reach data
    outside my own Project.

## Implementation Decisions

**No new tables.** Every number on these pages is computed from the existing `test_cases`, `test_attempts`
and `test_results` tables; nothing here is stored, matching the phase's own instruction to avoid a
statistics table until performance actually demands one.

**One new pure aggregation function is the seam nearly everything else builds on.** Alongside the
existing Outcome-tally function in the Testing Attempts data layer, a new function takes a Build's live
`Ready` Cases and every one of its Attempts (each with its `attemptNumber` and Results), and returns: the
latest Result per Case (the Result belonging to the highest-numbered Attempt that reached that Case, with
no fallback to an older Attempt); a six-way tally (the five existing Outcomes, plus a computed Not Tested
count for Cases no Attempt has ever reached); `tested` (total minus Not Tested), `total`, completion
percentage, and pass rate (`Passed ÷ tested`, `0` when `tested` is `0` rather than `NaN`). Every page in
this phase — Build Report, Release Summary's per-Build rows, and the Project Dashboard — calls this same
function; none computes its own version of "how is this Build doing."

**Not Tested is folded into the summary card, kept distinct underneath.** The top-line summary card shows
one number for "not yet given a real verdict" — Not Run and Not Tested combined — matching the shape the
original brief's own example table uses. The per-Case detail views (Failure Overview's neighbouring "all
Cases" context, if shown; the Case-by-Case list generally) keep the two visually distinct: a Not Run badge
for a Case an Attempt has reached, a plain dash for one no Attempt ever has. `CONTEXT.md`'s Outcome note
already records why Not Tested is a dashboard concept, never a stored value or a sixth Outcome.

**Only `Ready` Cases feed the totals.** The aggregation function filters to `status = 'Ready'` before
computing anything else. A Case that was Ready, tested, and later Deprecated keeps any Failed or Blocked
Result it already earned visible in the Failure Overview specifically — that list is sourced independently
from the totals, not filtered by the Case's *current* status — but drops out of `total`, `tested`, and
every percentage the moment it's no longer Ready.

**Release Summary and Project Dashboard are read-only rollups, never blended totals**, per ADR-0007. The
Release Summary calls the Build Report's own aggregation function once per Build under the Release and
renders the results as a list, most-recent-Build-first, with that one flagged as current. The Project
Dashboard is the current Build's Report — most recent Build of the most recently produced Release, by
default — with Release and Build pickers that navigate to another Build's own Report data; it does not
introduce a Project-wide aggregate number of its own.

**Routing**: the Build gains its own Report route alongside its existing Attempts and Cases sections,
reachable from Build Details. The existing Project overview page becomes the Project Dashboard in place,
and the existing Release page becomes the Release Summary in place — both enriched, neither replaced nor
newly routed.

**Tester Activity and Recent Results reuse the existing person-resolution pattern.** Both are sourced from
`test_results` (`executedBy`, `executedAt`, `outcome`, plus the Case it concerns), joined against the
Project's current membership list the same way the Attempt Report already resolves `createdBy` and
`executedBy` — a Member's current display name when they're still resolvable, an explicit "no longer in
the Project" fallback message when they're not. No new resolution mechanism; Tester Activity is a
differently-shaped view over data and a pattern that already exist.

**Filters narrow lists, never summary numbers.** Release, Build, Outcome, tester, and date-range filters
apply to the Failure Overview, Recent Results, and Tester Activity lists on the page they're scoped to;
the summary cards above them are always computed unfiltered, so they stay trustworthy regardless of
whatever the lists below are currently narrowed to. "Release" and "Build" in the filter set are the
navigation pickers described above, not a multi-Build blend — every list on every one of these pages stays
scoped to a single selected Build, matching ADR-0007.

**No new RLS policies.** The existing "Members can read their Project's Attempts/Results" and Cases
policies already scope every table this phase reads by Project membership; these pages issue ordinary
authenticated reads through the same policies every other page already relies on.

**Design, per `DESIGN.md`.** The Outcome breakdown reuses the existing Progress / Execution Bar component
directly — segmented proportionally across the status scale, with its dot-plus-label-plus-count legend —
extended to accept the Report's Not-Tested-inclusive six-way tally rather than only the five Outcomes an
Attempt's own progress bar shows. Completion is a separate, plain progress indicator, not the same bar,
per the "how much is done" versus "how it went" distinction the user stories draw. Failure Overview rows
use the existing Outcome status chip for Failed/Blocked distinction. No charting library is introduced —
nothing in this phase needs a time-series view, and the existing token-driven bar component already
satisfies "colour means status, and status alone" without a new dependency.

## Testing Decisions

**A good test here asserts what a Member could observe** — the numbers on the page, which Cases appear in
the Failure Overview and why, what a filter narrows versus leaves alone, what a non-member sees instead —
never the shape of the aggregation function's internals.

**The same three seams Phases 1–4 already established, none new.**

*Pure functions are the primary seam this phase adds to.* The new aggregation function is unit-tested
directly, with fixture Attempts and Results, no database involved: a Case reached by two Attempts takes
the newer's verdict, never the older's; a Case reached only by an in-progress Attempt already counts; a
Case no Attempt has reached is Not Tested, distinct from one that's Not Run; a Deprecated Case with an old
Failed Result is excluded from totals but still surfaced to the Failure-Overview-shaped output; pass rate
is `0`, not `NaN`, when nothing has been tested yet; a Build with zero Ready Cases produces a well-formed
zero-valued result rather than dividing by zero. This mirrors the existing Outcome-tally function's own
unit test file in shape and intent.

*The browser is the second seam.* One new end-to-end spec drives a real signed-in Member through the
Project Dashboard, into a Release Summary, into a Build Report: the summary numbers match what fixture
Attempts and Results were set up to produce, the Failure Overview lists exactly the Failed/Blocked Cases
expected and narrows correctly when a status filter is applied, Recent Results and Tester Activity show
the expected rows and narrow by tester and date, and a non-member is refused every one of these pages
identically to how Phase 4 refused an Attempt. Prior art: the existing Attempt Report spec for the
read-only-page-assembled-from-several-pieces-of-state shape, and the existing Builds spec for list-with-
filter coverage.

*The database is the third seam, reached the way an attacker would.* No new RLS test file — the existing
Attempts/Results/Cases RLS coverage already exercises the exact policies this phase's reads depend on, and
this phase adds no new policy for that coverage to miss.

**Deliberately not seams:** no mocked Supabase client, no isolated Server Action tests (this phase reads,
it doesn't write), no component-level tests for the picker or filter controls — exercised through the
browser suite, the same discipline every prior phase applied to its own interactive controls.

## Out of Scope

- **A cross-Build or cross-Release blended total.** ADR-0007 rules this out deliberately: Cases don't
  carry across Builds, so a summed number would misrepresent what's being measured. Every report stays
  scoped to one Build; Release Summary and Project Dashboard are breakdowns and pickers, not aggregates.
- **Trend-over-time charts.** There is no time-series data model behind "pass rate over the last month" —
  only point-in-time Attempt/Result data — so no such chart is built this phase.
- **A per-tester leaderboard.** Tester Activity is a chronological feed of Results recorded, not an
  aggregated per-person scoreboard.
- **Exporting or printing any Report, Summary, or Dashboard.** These are pages in the product, not
  generated documents, matching the same boundary Phase 4 drew for the Attempt Report.
- **A new statistics table or materialized view.** Every number is computed live from existing rows; a
  dedicated table is explicitly deferred until performance demands it, per the phase's own brief.
- **Any change to what an Outcome, Case Status, or Attempt Status can be.** This phase reports on the
  existing five Outcomes and existing Case/Attempt lifecycles; it adds no new value to any of them —
  Not Tested included, which stays a dashboard computation, never a stored value.
- **Real-time/live-updating dashboards.** These pages reflect the state as of the page load, the same
  last-write-wins, reload-to-refresh model every prior phase has used; nothing here adds a realtime layer.
- **Any deploy-related work.** No hosted Supabase project, no production URLs, no CI secrets — unchanged
  from every prior phase.

## Further Notes

**One ADR accompanies this spec**, already written: `docs/adr/0007-reporting-does-not-roll-up-across-
builds.md` records why Release Summary and Project Dashboard show per-Build breakdowns rather than
blended totals, and why that's the direct reporting-layer consequence of ADR-0005.

**`CONTEXT.md` already carries this phase's one new distinction.** The Outcome note's existing entry was
extended, during this spec's own preparation, to record Not Tested as a dashboard-computed concept
distinct from the Not Run Outcome — not a sixth Outcome value, and never stored.

**This phase is the direct answer to a gap Phase 4 named and deliberately deferred.** Phase 4's own Out
of Scope listed "a cross-Build or cross-Release testing dashboard" in almost those exact words; this spec
is that dashboard, built entirely on the Attempts and Results Phase 4 already made durable.
