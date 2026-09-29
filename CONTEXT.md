# CasePilot

Test-execution tracking for software QA teams: what was tested, against which build, by whom, and
what happened — with a history that can be audited rather than overwritten.

## Language

**User**:
A person who holds credentials and signs in to CasePilot.
_Avoid_: Account, tester

**Project**:
A tenant boundary that owns Releases and Defects, and to which Users are invited. A User may
belong to several; work happens in one at a time, and which one is always evident from where the
User is rather than remembered on their behalf.
_Avoid_: Workspace, organisation, team, account

**Release**:
A named version or milestone of a Project's software — e.g. `1.0.0` — holding the Builds produced
under it. Identified within its Project by its version, which is unique there but not globally.
_Avoid_: Version (the field on a Release, not the entity itself)

**Build**:
A specific, testable build produced under a Release, identified by a build number — e.g. `100` — that
is assigned externally (by CI) and recorded here, not minted by CasePilot. Unique within its Release,
not within its Project: two Releases may each have a "Build 100". Cases belong to a Build, not to its
Release or Project, and do not carry forward when a new Build is produced. See ADR-0005.

**Membership**:
The record that a particular User belongs to a particular Project, carrying their Role and when
they joined. A User has at most one Membership per Project. It is what makes a Project's contents
visible to them, and removing it is what ends that.
_Avoid_: Access, permission, seat

**Role**:
What a Membership entitles its User to do in that Project: **Owner** or **Member**. An Owner can
change the Project and decide who else belongs to it; a Member can see and work in it, and can
leave. Every Project has exactly one Owner, from the moment it is created.

**Invitation**:
An offer, addressed to an email address, to take up a Membership of a Project. It is issued by that
Project's Owner, expires, and is spent the moment it is accepted. Until then the invited person is
not part of the Project in any way.
_Avoid_: Request, join link, share

**Case**:
A single test case: one thing to verify, identified as `TC-nnn` unique within its Build. It belongs to
that Build specifically, not to the Release or Project — a Case written against Build 100 is not
automatically part of Build 101. See ADR-0005.
_Avoid_: Legal case, matter, docket, test scenario, script

**Attempt**:
One pass through a Build's Cases: started by a User, worked by whichever Users record Results against
it, and either still open or brought to a close. Belongs to a Build, not to a single Case or to the
User who started it — a Build may carry several Attempts, independent of one another and of any Case
edited after they were taken. See ADR-0006.
_Avoid_: Test run, session, execution (as a noun — "execute a Case" is fine as plain English for the
act; the record of it is the Attempt)

**Result**:
What was found when one Case was worked within one Attempt: an Outcome, optional notes, and who
recorded it. Belongs to an Attempt and points at the Case it concerns, but does not read that Case
live — it holds its own copy of the Case's title, description, preconditions, steps and expected
result as they stood the moment the Attempt began, so a later edit to the Case cannot reach back and
change what an already-recorded Result meant. See ADR-0006.
_Avoid_: Test result, execution record

### Notes on contested terms

**Account** is deliberately absent. It was doing three jobs at once — the person, the credentials,
and the tenant — which are now **User** and **Project**.

**Member** is a Role, never a person. "A Member" and "the Members" are correct when naming what a
Role entitles someone to, or the people holding a Membership of one Project; a person in general is
a **User**. Writing "a member signed in" is the drift this note exists to stop, because it quietly
implies belonging where none has been established.

**Case** is the project's most dangerous word. The Stitch design system's prose drifted into
describing CasePilot as legal-tech serving "legal-tech specialists" with "case docket numbers",
because nothing pinned the word down. In CasePilot a Case is always a *test* case.

**Status** now names two different things, and a third was deliberately kept out of the word. A
Case has a Status (Draft, Ready, Deprecated) and an Attempt has a Status (In Progress, Completed) —
both are genuinely "where this entity stands in its own lifecycle", and which entity's Status is
meant is always evident from context, the same way "a Project's Owner" and "an Invitation's Owner"
would not need disambiguating if the latter existed. What a Result carries is a different kind of
fact — not where it stands, but what was found — so it is not a Status at all: it is an **Outcome**
(Not Run, Passed, Failed, Blocked, Skipped — `DESIGN.md`'s status scale already named and coloured
these five before this phase existed, and Phase 3's own spec called them "the five execution
verdicts... arriving in Phase 4"; this phase conforms to that naming rather than inventing "Not
Tested"). Calling it a status would let it drift toward meaning "where this Result is in some
process," which is exactly the ambiguity Case's and Attempt's Status already occupy.
