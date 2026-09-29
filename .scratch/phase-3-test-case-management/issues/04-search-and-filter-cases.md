# 04: Search and filter the Case list

**What to build:** The Test Cases section gains a search box and status/priority filters that combine,
extending ticket 02's list the same way Releases already search.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] A search box filters the visible Cases by title as the Member types, client-side, with no server
      round-trip
- [x] A status filter and a priority filter are available and combine with the text search and with each
      other
- [x] A search/filter combination that matches nothing shows a plain "no matches" state, distinct from
      the "no Cases at all" empty state
- [x] Clearing search and filters restores the full list
- [x] Browser tests cover searching alone, filtering alone, combining both, and the no-matches state
