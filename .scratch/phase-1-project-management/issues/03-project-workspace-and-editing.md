# 03: The Project workspace, and editing it

**What to build:** The `[projectId]` shell — the `DESIGN.md` sidebar with its Project switcher and its
navigation — plus the overview page and the settings page where an Owner edits the name and
description. Also the guards that make all of it safe: `lib/projects/dal.ts` with
`requireProjectMembership(projectId)` and `requireProjectOwnership(projectId)`.

Both guards call `notFound()`. A non-member asking for a Project must get exactly what they would get
for a Project that never existed: "this exists but is not yours" is itself a disclosure, and
row-level security returns zero rows either way, so the 404 is the truthful rendering of what the
database said. Build on `verifySession()` rather than beside it — the authentication boundary does not
move.

The sidebar is a *Project* shell, which is why it lives in this layout and not above `/projects`. Its
`WORKSPACE` eyebrow becomes `PROJECT`: the design predates the glossary and `CONTEXT.md` retired
"workspace". The switcher is plain navigation between `/projects/[projectId]` URLs — there is no
stored current Project anywhere, so the URL is the whole of the answer, and two tabs on two Projects
must both work.

The overview states the truth about the phase: name, description, Member count, created date, and a
plain note that Releases, Builds and Cases arrive next. Do not draw empty frames for features that do
not exist.

Settings is reachable by both Roles and shows each only what applies: the edit form for an Owner,
**Leave Project** for a Member (ticket 07 builds the leaving). The Owner sees no Leave control at all,
not a disabled one.

Dynamic segments changed in this version of Next.js. Read `node_modules/next/dist/docs/` on routing
and layouts before writing the page, not after.

**Blocked by:** 02.

**Status:** ready-for-agent

- [ ] `lib/projects/dal.ts` exposes `requireProjectMembership` and `requireProjectOwnership`, both built on `verifySession()` and both calling `notFound()`
- [ ] A signed-in non-member opening a Project URL gets a 404 — not a redirect, not a "forbidden" page, and nothing that reveals the Project exists
- [ ] A signed-out visitor opening a Project URL is sent to sign-in by the proxy, as before
- [ ] `/projects/[projectId]` renders the sidebar shell from `DESIGN.md`, with `PROJECT` as the eyebrow rather than `WORKSPACE`
- [ ] The switcher lists the User's other Projects and navigates to them; nothing about the current Project is stored server-side
- [ ] Two Projects open in two tabs both work, and a Project URL survives being bookmarked and shared with a fellow Member
- [ ] The overview shows name, description, Member count and created date, and says plainly that Releases, Builds and Cases arrive next
- [ ] `/projects/[projectId]/settings` shows the Owner a form for name and description, with the same rules as creation, enforced again in the action
- [ ] A Member sees no editing controls on Settings at all, and an update attempted by a Member is refused by the database as well as absent from the interface
- [ ] Saving changes updates the Project, bumps `updated_at`, and shows the new values
- [ ] Browser tests cover the 404 for a non-member, a successful edit by an Owner, an edit rejected for an invalid name, and a Member finding no edit form
