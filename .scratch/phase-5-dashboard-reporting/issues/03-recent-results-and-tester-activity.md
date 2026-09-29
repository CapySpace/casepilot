# 03: Recent Results & Tester Activity

**What to build:** The Build Report's chronological Results feed and Tester Activity view — who recorded
what, on which Case, with what Outcome, and when — filterable by tester, Outcome, and date range, reusing
the existing person-resolution pattern for a Result recorded by someone who's since left the Project.

See `.scratch/phase-5-dashboard-reporting/spec.md` for the full Implementation Decisions this ticket
implements.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The Build Report shows the Build's most recently recorded Results, newest first
- [ ] Tester Activity is sourced from Results being recorded specifically (`executed_by`/`executed_at`),
      not from Attempts being started or completed
- [ ] Each row shows who recorded it, the Case, the Outcome, and when
- [ ] A Result recorded by someone no longer in the Project is attributed using the existing
      name-resolution helper: their current display name if still resolvable, the same "no longer in the
      Project" fallback message the Attempt Report already uses if not
- [ ] Filters narrow this feed by tester, Outcome, and a date range (against `executed_at`)
- [ ] Applying a filter narrows this feed only — the Build Report's summary cards from ticket 01 stay
      unfiltered
- [ ] A Build with no Results yet shows an honest empty state
- [ ] Browser tests cover the feed showing expected rows from fixture data, each filter narrowing
      correctly, a departed Member's Result showing the fallback attribution, and the summary cards
      staying unchanged while the feed is filtered
