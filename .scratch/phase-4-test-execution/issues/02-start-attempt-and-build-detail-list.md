# 02: Start an Attempt and see it on Build Detail

**What to build:** The Start Testing Attempt action end-to-end — the button, the transactional creation
of the Attempt and its snapshotted Results, a redirect into the execution page showing the frozen
snapshot (read-only at this stage; recording arrives in ticket 03), and the Testing Attempts section on
Build Detail. This is the first end-to-end slice: a Member starts an Attempt and sees it exist.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] Build Detail shows a Testing Attempts section (the Timeline component from `DESIGN.md` §4) with a
      "▶ Record Attempt" primary action
- [x] The action is disabled, with an explanation, when the Build has no eligible Cases (non-deleted, any
      `status`)
- [x] Starting inserts the `test_attempts` row and one `test_results` row per eligible Case in a single
      transaction, snapshotting each Case's title, description, preconditions, steps and expected result
      as they stand at that instant
- [x] The new Attempt is numbered "Attempt #N", sequential within its Build
- [x] Starting redirects to `.../builds/[buildId]/attempts/[attemptId]/execute`
- [x] The execution page shows every Case in the Attempt with its full snapshot (title, description,
      preconditions, steps, expected result) and its Outcome as `Not Run`
- [x] The Testing Attempts section lists every Attempt taken against the Build: its number, its tester
      (`created_by`), its progress (`0 / N` immediately after starting), its Outcome breakdown, its status
      chip (`In Progress`), and its start time
- [x] A Build with no Attempts yet shows an honest empty state explaining how to start one
- [x] Any Member of the Project — not only whoever created the Build — can start an Attempt
- [x] A non-member's URL for a Build's execution or report page returns not-found, not an error that
      discloses the Attempt exists
- [x] Browser tests cover starting an Attempt, the empty-Build refusal, the Attempt appearing in the
      Testing Attempts section with the correct number/tester/progress, and the snapshot shown on the
      execution page matching the Case as it stood at start time
