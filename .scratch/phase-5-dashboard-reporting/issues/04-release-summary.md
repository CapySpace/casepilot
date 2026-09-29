# 04: Release Summary

**What to build:** The Release page becomes the Release Summary described in ADR-0007: a per-Build
breakdown list, each Build's own numbers computed by ticket 01's shared aggregation function, never
blended into a single Release-wide total.

See `.scratch/phase-5-dashboard-reporting/spec.md` for the full Implementation Decisions this ticket
implements, and `docs/adr/0007-reporting-does-not-roll-up-across-builds.md` for why there's no combined
total.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The Release page lists every Build produced under it, each with its own Total/Tested/Not
      Tested/Passed/Failed/Blocked/Skipped, completion %, and pass rate — computed by the same
      aggregation function ticket 01 built, called once per Build
- [ ] No single summed or averaged number spans more than one Build
- [ ] The most recently produced Build is visually called out as the current one
- [ ] Each row links through to that Build's own Report
- [ ] A Release with no Builds yet shows an honest empty state
- [ ] A Release whose Builds have no Ready Cases yet shows an honest empty state for that Build's row,
      rather than a broken chart or division error
- [ ] A non-member's URL for a Release Summary returns not-found
- [ ] Browser tests cover the per-Build breakdown matching fixture data across at least two Builds with
      different, unrelated Case sets, the current-Build callout, and the non-member refusal
