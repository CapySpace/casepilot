# 03: Record Results on the execution screen

**What to build:** Turn the execution page built in ticket 02 interactive — recording an Outcome and
notes per Case, saving imperatively with no navigation, the progress bar and Outcome breakdown updating
live, and any Member being able to pick up and work an in-progress Attempt, not only whoever started it.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] Each Case on the execution page offers Passed/Failed/Blocked/Skipped controls (Status Chips drawn
      from `DESIGN.md`'s status scale); selecting one saves immediately via a direct Server Action call —
      no page navigation, no full reload
- [x] A notes field per Case saves through the same Action, debounced roughly 500ms after the last
      keystroke, not on every character
- [x] `executed_by` and `executed_at` are set, or updated, to whoever last saved that Result
- [x] The progress indicator ("Tested: X / Y") and the Outcome breakdown (Passed/Failed/Blocked/Skipped/
      Not Run counts) update immediately after each save, in place, without a page reload
- [x] A Member can jump directly to any Case in the Attempt, not only step through in sequence — a rail
      or equivalent lists every Case with its current Outcome chip as a navigation target
- [x] A Result already recorded can be changed — a different Outcome, edited notes — at any time before
      the Attempt is completed
- [x] Any Member of the Project, not only whoever started the Attempt, can record or edit Results on an
      in-progress Attempt
- [x] Attempting to record a Result on an Attempt that has since been completed (by anyone) fails loudly
      and visibly to the user, rather than silently succeeding or silently discarding the edit
- [x] Browser tests cover recording every Outcome, editing notes, the live progress/breakdown updates,
      jump-to-Case navigation, changing an already-recorded Result, and a second Member picking up and
      recording against an Attempt they didn't start
