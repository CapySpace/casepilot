# 02: Create a Release, and see the Releases in a Project

**What to build:** `/projects/[projectId]/releases`, listing every Release belonging to the Project
with its Build count, and `/projects/[projectId]/releases/new`, which creates one. The sidebar gains a
Releases entry, and the Project Overview's placeholder sentence is corrected now that Releases are
real.

Creating a Release is one insert, validated the same way Project creation was: in the browser for
immediate feedback, and again in the action, because browser validation is not a security control.
`version` is required, trimmed, 1–100 characters; `name` and `description` are optional, with the
same length rules the spec gives. A version already used elsewhere in the Project is rejected with a
clear message, not a raw constraint-violation error. Creating a Release redirects into it — landing on
a minimal placeholder Release Details page that shows the Release exists and is guarded by
`requireProjectMembership`, the same deliberate-placeholder move Phase 1's ticket 02 made for
`/projects/[projectId]/page.tsx`. Ticket 03 replaces the placeholder's body.

The list shows only what row-level security returns; Releases belonging to Projects the User does not
belong to are absent, not filtered. A Project with no Releases yet shows an empty state explaining
what to do. Each row's Build count reads zero for every Release this ticket creates, since Build
creation does not exist until ticket 04 — that is correct, not a bug to work around.

The sidebar's Releases entry follows the existing `project-nav.tsx` pattern; the comment there
claiming Releases, Builds and Cases all arrive later is corrected to drop Releases specifically — it
has arrived. The Project Overview's card is updated the same way: it now says Builds and test cases
arrive next, not all three.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `/projects/[projectId]/releases` lists every Release in the Project, showing version, name if present, and its Build count
- [ ] Releases belonging to Projects the User does not belong to never appear, and the page does not filter them itself
- [ ] A Project with no Releases shows an empty state explaining what to do next
- [ ] `/projects/[projectId]/releases/new` creates a Release from a version and optional name and description
- [ ] An empty or whitespace-only version is rejected in the browser and again in the action
- [ ] A version, name or description over its stated length limit is rejected with a clear message
- [ ] Creating a Release with a version already used in the same Project is rejected with a clear message, not a raw database error
- [ ] The same version used in a different Project causes no conflict
- [ ] Creating a Release lands the User on its (placeholder) Release Details page
- [ ] The sidebar shows a Releases entry, and `project-nav.tsx`'s comment no longer lists Releases among what has not arrived
- [ ] The Project Overview states that Builds and test cases arrive next, not Releases
- [ ] A signed-in non-member opening the Releases list or a Release URL gets a 404, consistent with the rest of the Project shell
- [ ] Browser tests cover creation, both validation failures, the uniqueness collision, the empty state, and that a second User's Releases are absent from the first User's list
