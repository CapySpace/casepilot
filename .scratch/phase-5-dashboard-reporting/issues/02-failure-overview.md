# 02: Failure Overview

**What to build:** The focused Failed/Blocked Case list on the Build Report, filterable and visually
distinguishing the two Outcomes from each other, with each row linking through to the Result that
produced it.

See `.scratch/phase-5-dashboard-reporting/spec.md` for the full Implementation Decisions this ticket
implements.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The Build Report shows a list of every Ready-or-not Case whose latest Result is Failed or Blocked —
      sourced independently of the summary totals, so a Case that was Deprecated after being tested still
      appears here even though it no longer counts toward `total`/`tested`
- [ ] Failed and Blocked rows are visually distinguished from each other (status chip, not a single merged
      "problem" treatment)
- [ ] A filter narrows the list to Failed only, Blocked only, or both (default: both)
- [ ] Each row shows the Case's code, title, Outcome, who recorded the Result, and when
- [ ] Each row links through to the full Attempt Result (snapshot and notes included)
- [ ] Applying the filter narrows this list only — the Build Report's summary cards from ticket 01 stay
      unfiltered
- [ ] A Build with no Failed or Blocked Cases shows an honest empty state, not a blank section
- [ ] Browser tests cover the list showing the expected Failed/Blocked Cases from fixture data, the
      Failed/Blocked filter narrowing correctly, a Deprecated Case's old failure still appearing, and the
      summary cards staying unchanged while the list is filtered
