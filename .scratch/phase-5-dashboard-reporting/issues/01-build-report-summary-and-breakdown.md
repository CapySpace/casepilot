# 01: Build Report — summary, Outcome breakdown, completion & pass rate

**What to build:** The Build Report route and the one shared aggregation function every later ticket in
this phase calls into. The function takes a Build's live `Ready` Cases plus every Attempt-with-Results
taken against it, and computes: the latest Result per Case (the Result belonging to the
highest-numbered Attempt that reached that Case, no fallback to an older Attempt); a six-way tally (the
five existing Outcomes, plus a computed Not Tested count for Cases no Attempt has ever reached); `tested`,
`total`, completion percentage, and pass rate (`Passed ÷ tested`, `0` rather than `NaN` when nothing's
been tested). The Report page renders that as summary cards, a completion indicator, and an Outcome
breakdown bar.

See `.scratch/phase-5-dashboard-reporting/spec.md` for the full Implementation Decisions this ticket
implements, and `docs/adr/0007-reporting-does-not-roll-up-across-builds.md` for why every number here
stays scoped to one Build.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A new Report route exists under the Build, reachable from Build Details, alongside its existing
      Attempts and Cases sections
- [ ] The aggregation function filters to `status = 'Ready'` Cases before computing anything
- [ ] A Case reached by two or more Attempts reports the newer Attempt's Result; an Attempt that hasn't
      reached a given Case yet is never used to override what a later Attempt already gave it
- [ ] A Case reached only by a still-in-progress Attempt already counts toward the numbers — completion
      isn't gated on the Attempt being marked Completed
- [ ] A Case whose latest reaching Attempt gave it `Not Run` reports `Not Run`; a Case no Attempt has ever
      reached reports the distinct, dashboard-only `Not Tested` bucket
- [ ] The summary card folds `Not Run` and `Not Tested` into one "not yet tested" number, matching the
      original brief's own example
- [ ] Total, Tested, completion %, and pass rate are computed from `Ready` Cases only
- [ ] Pass rate is `0`, not `NaN` or an error, when `tested` is `0`
- [ ] A Build with zero `Ready` Cases shows an honest empty state, not a broken chart or a division error
- [ ] The Outcome breakdown renders as the existing Progress / Execution Bar component, segmented by the
      product's status scale, extended to show the six-way tally rather than only the five Outcomes an
      Attempt's own bar shows
- [ ] Completion is a separate, plain progress indicator from the Outcome bar
- [ ] A non-member's URL for a Build's Report returns not-found, matching the existing Attempt Report's
      own disclosure discipline
- [ ] Unit tests cover the aggregation function directly with fixture Attempts/Results: multi-Attempt
      supersession, in-progress-Attempt counting, the Not Run vs. Not Tested distinction, zero-Ready-Cases,
      and the zero-tested pass-rate case
- [ ] Browser tests cover opening the Report and seeing summary numbers that match a fixture Build's
      Attempts/Results, and the non-member refusal
