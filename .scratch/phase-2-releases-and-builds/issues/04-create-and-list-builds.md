# 04: Create a Build, see the Builds under a Release, and Build details

**What to build:** An "Add Build" action on Release Details that creates a Build under it, the real
Build list replacing ticket 03's empty state, and `/projects/[projectId]/releases/[releaseId]/builds/[buildId]`
showing a Build's details. This is the ticket that finally makes the Project Overview's placeholder
sentence fully true.

Creating a Build validates the same way Release creation did: `build_number` required, trimmed,
1–100 characters; `description` optional, ≤ 500 characters. A build number already used under the
same Release is rejected with a clear message; the same number used under a different Release causes
no conflict — CI's own numbering is not CasePilot's to constrain. Builds are create-and-view only in
this phase: there is no edit form, and none should be built — the spec's Core Functions table never
lists editing a Build, and a build number is a record of what was tested, not a value to revise later.

Build Details shows the number and description, and states plainly that test cases are not here yet —
they arrive in Phase 3 — the same honest-empty-state discipline the Project Overview and Release
Details already practise. The URL names the Project, Release and Build together, so it survives being
bookmarked, shared, and opened in two tabs.

This is also where the Project Overview's sentence reaches its final form: it now says only that test
cases arrive next, since Releases and Builds are both real.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Release Details shows an "Add Build" action that creates a Build from a build number and optional description
- [ ] An empty or whitespace-only build number is rejected in the browser and again in the action
- [ ] A build number or description over its stated length limit is rejected with a clear message
- [ ] Creating a Build with a number already used under the same Release is rejected with a clear message, not a raw database error
- [ ] The same build number used under a different Release causes no conflict
- [ ] Creating a Build shows it immediately in its Release's Build list
- [ ] Release Details' Build list shows every Build recorded under that Release, in a useful order
- [ ] `/projects/[projectId]/releases/[releaseId]/builds/[buildId]` shows the Build's number and description
- [ ] Build Details states plainly that test cases arrive in Phase 3, not a blank or placeholder section
- [ ] There is no way to edit a Build's number or description anywhere in the interface
- [ ] A signed-in non-member opening a Build's URL gets a 404
- [ ] The Project Overview states only that test cases arrive next
- [ ] Browser tests cover creating a Build, the validation failures, the uniqueness collision, viewing Build Details, and a non-member's 404
