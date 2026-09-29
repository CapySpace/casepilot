# Cases belong to a Build, not a Project

A Case is written against one specific Build and does not carry forward when a new Build is produced
— testing Build 101 with the Cases written for Build 100 means re-adding them, not inheriting them.
`TC-nnn` is unique within its Build, not within the Project.

This corrects earlier language (in `CONTEXT.md` and the `projects` migration) that described Cases as
belonging to the Project. The alternative — a Project-level, reusable Case library that a Build draws
from, with Cases shared or copied across Builds — is a real design with its own questions (what
happens to a shared Case's executions when it's edited? is a Build's set a copy or a live reference?)
that this phase deliberately does not answer. Build-scoping is the simpler model and matches what the
Phase 3 spec actually asks for: viewing, creating and editing the Cases that belong to a selected
Build.

A Case library is not ruled out — it would most likely arrive as an explicit later feature (e.g.
"clone Cases from another Build") rather than a retrofit of this one, since retrofitting reuse onto
Cases that already have per-Build identity and, from Phase 4 on, per-Build execution history, is the
harder direction to build in afterwards.
