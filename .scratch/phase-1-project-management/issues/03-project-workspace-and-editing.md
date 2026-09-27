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

- [x] `lib/projects/dal.ts` exposes `requireProjectMembership` and `requireProjectOwnership`, both built on `verifySession()` and both calling `notFound()`
- [x] A signed-in non-member opening a Project URL gets a 404 — not a redirect, not a "forbidden" page, and nothing that reveals the Project exists
- [x] A signed-out visitor opening a Project URL is sent to sign-in by the proxy, as before
- [x] `/projects/[projectId]` renders the sidebar shell from `DESIGN.md`, with `PROJECT` as the eyebrow rather than `WORKSPACE`
- [x] The switcher lists the User's other Projects and navigates to them; nothing about the current Project is stored server-side
- [x] Two Projects open in two tabs both work, and a Project URL survives being bookmarked and shared with a fellow Member
- [x] The overview shows name, description, Member count and created date, and says plainly that Releases, Builds and Cases arrive next
- [x] `/projects/[projectId]/settings` shows the Owner a form for name and description, with the same rules as creation, enforced again in the action
- [x] A Member sees no editing controls on Settings at all, and an update attempted by a Member is refused by the database as well as absent from the interface
- [x] Saving changes updates the Project, bumps `updated_at`, and shows the new values
- [x] Browser tests cover the 404 for a non-member, a successful edit by an Owner, an edit rejected for an invalid name, and a Member finding no edit form

## Comments

**The sidebar lists only what exists.** Overview and Settings, and nothing else: Members is ticket 04
and Releases, Builds and Cases are the next phase. A navigation item that goes nowhere, or one drawn
greyed out, is the "control you cannot use" this ticket already rejects for the Owner's Leave button.
Ticket 04 adds Members to `app/projects/[projectId]/_components/project-nav.tsx`.

**Two deliberate departures from the design, both smaller than they sound:**

- **The switcher is a native `<details>`**, not a dropdown component. It opens with no JavaScript,
  which matters because the switcher is how somebody gets *out* of a Project, and it costs no new
  dependency. `shadcn`'s dropdown can replace it the day the switcher needs to do more than link.
- **On a narrow screen the sidebar stacks above the content** rather than sliding over it. DESIGN.md §5
  calls for a slide-over at tablet width; that needs JavaScript and a dialog, and stacking is the
  honest version until something needs more.

**A token was missing, so it was added rather than worked around.** DESIGN.md §2 names Pale Mint Wash
in prose but nothing wired it, and the active navigation item needs it. `--brand-wash` (`bg-brand-wash`)
now exists, with a note in DESIGN.md §2 explaining why it is a *second* token rather than reuse of
`--passed-container`: the two tints differ in the design, and more importantly an active navigation item
is brand, not status. `bg-passed-container` there would put a verdict in the navigation. The trailing dot
is `bg-brand` for the same reason.

**`requireProjectMembership` runs in the layout as well as in each page.** The layout renders the
Project's name, so it reads Project data and is guarded like anything else that does. It is `cache`d, so
the page beneath it does not pay for a second query.

**The settings route is open to both Roles; the settings *action* is not.** `settings/page.tsx` guards
with `requireProjectMembership`, so a Member gets the page and is told plainly that the Owner is who can
change these details — which is what the spec asks for, and what gives a Member a reason to open
Settings at all once ticket 07 puts Leave there. `requireProjectOwnership` guards the *action*, and 404s
a Member exactly as it 404s a stranger: "you are not the owner" is a truthful answer to a question
nobody should be able to ask by posting to an endpoint, so both refusals are the same one. Row-level
security refuses the write underneath either way.

**The saved-successfully notice is neutral, not green.** A save that worked is not a *Passed* verdict,
and `tests/unit/role-is-not-a-status.test.ts` would have caught it if it had been.

**What the review changed.**

- **A bound Server Action does not progressively enhance, and a test caught it.** The settings action
  was `updateProject.bind(null, projectId)`, which is tidier and — measured against Next.js 16.3.6 —
  hangs. With the client bundle disabled the POST sits in application code for as long as the browser
  will wait (24 to 49 seconds) and is then aborted; the same action unbound answers in 116ms. The id is
  now a hidden field, and `requireProjectOwnership` is what makes that safe: an edited id gets the same
  404 a stranger gets, with row-level security behind it. The field is an argument, not a permission.
  This is the class of thing AGENTS.md warns about — the framework is not the one in anyone's training
  data — and the only reason it was found is that the ticket asked for the no-JavaScript path to be
  driven.
- **The action's own validation was proven by nothing.** With JavaScript the form refuses first, so the
  interface never reaches the server's copy. There is now a no-JavaScript test for the settings form as
  well as the create form, which drives exactly that.
- **One assertion could not fail**: it read back the string the test had just typed into the field. It
  now reloads first, so the value comes from the database.
- **Two hard standards violations**: `pl-[calc(var(--spacing-sm)-2px)]` — a raw pixel in a bracket
  value, which the design rules forbid — is gone, the leading edge now drawn as an inset layer so no
  padding needs compensating; and the test file no longer carries the retired word *workspace* in its
  name.
- **Two more of §5's numbers became tokens**, as DESIGN.md's own radius note says they should:
  `--container-sidebar` (`w-sidebar`) and `--breakpoint-desktop` (`desktop:`, 1200px). Tailwind's `lg`
  and `xl` straddle the 1200px line the design names, so neither was the breakpoint meant; the sidebar
  was collapsing 176px early.
- **The sidebar is `rounded-2xl`**, because §5's radius table maps by what an element *is* and this is a
  panel, not a data card.
- **Accessibility**: both eyebrows are now real headings via a shared `Eyebrow` component, the
  navigation is named by its own heading rather than a differently-worded `aria-label`, and the switcher
  announces what it does ("Switch project, currently …") rather than only the name it displays. Four
  copies of the same three utilities became one component on the way.
- **The mirroring logic is a hook.** `useProjectDetails` holds what the create and settings forms were
  duplicating verbatim; the forms themselves stay separate, because they differ in submit semantics and
  chrome and a props-driven merge would be worse than the copy. `ProjectDetails` — already declared in
  the validation module — now names the name-and-description pair in both actions' state and the form's
  props, where the shape had been re-declared three times.
- **An empty aggregate now throws** instead of indexing `[0]` into nothing: "0 members" for a Project
  the caller is standing inside is a visible lie, and a lie is worse than a page that fails.
