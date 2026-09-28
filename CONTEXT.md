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
not within its Project: two Releases may each have a "Build 100". Test-execution work (Phase 3) attaches
here.

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
A single test case: one thing to verify, identified as `TC-nnn`, belonging to a Project.
_Avoid_: Legal case, matter, docket, test scenario, script

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
