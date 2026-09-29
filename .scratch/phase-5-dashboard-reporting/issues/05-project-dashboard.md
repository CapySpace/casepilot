# 05: Project Dashboard

**What to build:** The Project's own page becomes its Dashboard — the current Build's Report (most
recent Build of the most recently produced Release) by default, with Release and Build pickers to look at
another one, reusing ticket 01's Report rendering rather than introducing a Project-wide aggregate.

See `.scratch/phase-5-dashboard-reporting/spec.md` for the full Implementation Decisions this ticket
implements.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Opening a Project shows the current Build's Report — most recent Build of the most recently
      produced Release — without the Member having to pick anything first
- [ ] Release and Build pickers let a Member switch to another Build's Report without leaving the page
- [ ] No Project-wide number is introduced that blends more than one Build's Cases
- [ ] A Project with no Releases yet shows an honest empty state explaining what's missing
- [ ] A Project whose current Release has no Builds yet shows an honest empty state
- [ ] A Project whose current Build has no Ready Cases yet shows an honest empty state, matching ticket
      01's own empty state rather than a new one
- [ ] A non-member sees nothing about the Project's testing state
- [ ] Browser tests cover the Dashboard opening on the expected current Build's numbers, switching Release
      and Build via the pickers, and each empty state
