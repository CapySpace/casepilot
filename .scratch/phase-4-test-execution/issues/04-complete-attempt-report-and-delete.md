# 04: Complete an Attempt, the read-only Report, and deleting an in-progress Attempt

**What to build:** The Complete action and the permanence it creates, the read-only Attempt Report, and
deleting an Attempt while it's still in progress — closing the loop the spec describes end to end.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] A "Complete Attempt" action is available on the execution screen and succeeds regardless of how
      many Results are still `Not Run`
- [x] Completing sets `status` to `Completed` and `completed_at` to now, then redirects to the read-only
      Attempt Report
- [x] After completion, visiting `.../execute` for that Attempt redirects to the Report instead of
      showing editable controls, and the underlying write is refused by ticket 01's freeze trigger even
      if reached directly
- [x] The Attempt Report (`.../builds/[buildId]/attempts/[attemptId]`) shows: overall progress
      ("Tested: X / Y"), the Outcome breakdown, every individual Result (Case title, Outcome chip, notes,
      `executed_by`, `executed_at`), the Attempt's tester (`created_by`), and its `started_at`/
      `completed_at`
- [x] The Report is reachable and correct for an in-progress Attempt too — read-only there as well, with
      a link onward to the execution screen to keep working it while it's still open
- [x] A Completed Attempt cannot be reopened: no control anywhere offers it, and the underlying `UPDATE`
      is refused by RLS regardless
- [x] An in-progress Attempt can be deleted, by any Member, from the Testing Attempts section or the
      Report, behind a confirmation step
- [x] A Completed Attempt cannot be deleted: no control offers it, and the underlying `DELETE` is refused
      by RLS regardless
- [x] Deleting an Attempt removes its Results with it (cascade) and it no longer appears in the Build's
      Testing Attempts section
- [x] Each Testing Attempts Timeline entry's medallion follows the adapted rule from the spec: any Failed
      Result → the crimson cross; else any Blocked or Skipped → amber; else, once Completed, all-Passed →
      the emerald check; while still `In Progress` → Dormant Grey
- [x] Browser tests cover completing an Attempt with Cases still `Not Run`, the execution screen becoming
      read-only afterward, the Report's content for both an in-progress and a Completed Attempt, deleting
      an in-progress Attempt with its confirmation, and a Completed Attempt offering no delete control
