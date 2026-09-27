# CasePilot

Test-execution tracking for software QA teams: what was tested, against which build, by whom, and
what happened — with a history that can be audited rather than overwritten.

## Language

**User**:
A person who holds credentials and signs in to CasePilot.
_Avoid_: Account, member, tester

**Project**:
A tenant boundary that owns Cases, Builds and Defects, and to which Users are invited. A User may
belong to several; exactly one is active at a time, chosen from the switcher.
_Avoid_: Workspace, organisation, team, account

**Case**:
A single test case: one thing to verify, identified as `TC-nnn`, belonging to a Project.
_Avoid_: Legal case, matter, docket, test scenario, script

### Notes on contested terms

**Account** is deliberately absent. It was doing three jobs at once — the person, the credentials,
and the tenant — which are now **User** and **Project**.

**Case** is the project's most dangerous word. The Stitch design system's prose drifted into
describing CasePilot as legal-tech serving "legal-tech specialists" with "case docket numbers",
because nothing pinned the word down. In CasePilot a Case is always a *test* case.
