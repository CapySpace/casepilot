# 02: Create a Project, and see the Projects you belong to

**What to build:** `/projects`, which lists every Project the signed-in User belongs to with their
Role and the number of people in it, and `/projects/new`, which creates one. `/` becomes a redirect to
`/projects`, and the placeholder page in `app/page.tsx` is deleted — its own comment asked for that.

Creating a Project is one insert. The Owner Membership is the trigger's business (ticket 01), so the
action validates the name, inserts, and redirects into the new Project's workspace. Validation runs in
the browser for immediate feedback and again in the action, because browser validation is not a
security control — the same discipline as the authentication forms, and the name rule lives in
`lib/projects/messages.ts` so the hint, the check and the constraint cannot drift.

The list shows only what row-level security returns, which means Projects the User does not belong to
are absent rather than hidden — nothing on the page filters them. A User with none sees an empty state
that explains what a Project is for and offers the create action; a first sign-in must not be a dead
end.

Roles are not statuses. `DESIGN.md` reserves colour for the status scale, so `Owner` and `Member` are
set in type or a neutral Whisper Periwinkle chip. A green "Owner" badge would lie.

This is the first page of the phase, so read the App Router guides in `node_modules/next/dist/docs/`
first: this Next.js is not the one in your training data.

**Blocked by:** 01.

**Status:** ready-for-agent

- [x] `/projects` lists every Project the signed-in User belongs to, showing name, description, their Role and the number of people in it
- [x] Projects the User does not belong to never appear, and the page does not filter them itself
- [x] A User with no Projects sees an empty state explaining what to do next
- [x] `/` redirects to `/projects`, and `app/page.tsx`'s placeholder is gone
- [x] Signing in lands on `/projects`
- [x] `/projects/new` creates a Project from a name and an optional description, following the design's form treatment
- [x] An empty or whitespace-only name is rejected in the browser and again in the action, with the rule stated before submission
- [x] A name over 100 characters, or a description over 500, is rejected with a message from `lib/projects/messages.ts`
- [x] The creator is the Owner, with no second write from the action
- [x] Creating a Project lands the User in its workspace
- [x] Role is rendered without status colour
- [x] Browser tests cover creation, both validation failures, the empty state, the redirect from `/`, and that a second User's Projects are absent from the first User's list

## Comments

**The landing page moved, and three files had to agree about it.** `lib/auth/routes.ts` gained
`AUTHENTICATED_HOME`, and signing in, a confirmation link with no destination of its own, and `/` all
read it. `/` is now a signpost — a static page that redirects — kept for bookmarks and for
confirmation links written before the move. The authentication suite's assertions about landing on
`/` were changed to name the constant rather than spell a path, so the next move costs one line.

**Validation is duplicated on purpose, in both directions.** The action validates because it is
reachable by a direct POST; the form validates as the User types because a limit that is on screen the
whole time should never be enforced only after a round trip. Both read `validateProjectDetails`, and
`tests/unit/project-validation.test.ts` reads the migration, so the form's hint, the action's check and
the database's constraint cannot drift apart.

**Two things arrived slightly early, both declared:**

- **`app/projects/[projectId]/page.tsx`** is a deliberate placeholder, marked as such in the file.
  Creating a Project has to land somewhere, and landing on the list would make creating and using one
  two motions. It carries the guard that matters — `requireProjectMembership`, which 404s a non-member
  — so ticket 03 replaces the body and keeps the call.
- **`components/form/fields.tsx`**: the generic field parts (form alert, text field, error line) moved
  out of `app/(auth)/_components/fields.tsx`, which said in its own comment that they were extracted
  "once sign-up needed the same field markup". The Project form is the next caller, and two copies of
  an error-rendering convention is how two forms start disagreeing about what a rejected field looks
  like. What is genuinely about passwords stayed behind.

**One test exists to enforce a rule a diff cannot show.**
`tests/unit/role-is-not-a-status.test.ts` fails if anything under `app/projects/` reaches for a status
colour utility. `DESIGN.md`'s discipline is that colour means status alone, and a green "Owner" badge
would read as a verdict about the Project — green means Passed everywhere else in the product.

**What the review changed.** Both axes found real things, and two of them were behaviour rather than
style:

- **The member count was a plausible lie.** It counted rows returned by an unfiltered second query
  whose error was discarded, and PostgREST caps a response at `max_rows` (1000), so on a busy
  installation it would have started under-reporting silently — while a short count is
  indistinguishable from a small Project. It is now a database-computed aggregate in the same single
  query, and a failed query throws instead of rendering as "1 member".
- **`.order("name", { referencedTable: "projects" })` did not order the list.** PostgREST orders rows
  *within* an embed, so the comment claiming an alphabetical list was false and nothing tested it. The
  query is now Projects-first and ordered by the database, with a test asserting the order — the kind
  of mistake that looks identical in the code either way.
- **A Phase 1 criterion had regressed**: the signed-in address was `hidden sm:inline`, so "on a shared
  machine it is obvious whose session is active" stopped holding below 640px — and Playwright's
  default viewport hid that. It is shown at every width and truncates instead.
- **"Rejected in the browser" was display-only.** The form now refuses a known-bad submission in
  `onSubmit` rather than only colouring the field, and a test with `javaScriptEnabled: false` drives
  the action's own copy of the validation through a native post — which is the only honest way to prove
  both halves, since with the bundle loaded the interface never reaches the server's check.
- **Three documented standards were being broken**: "workspace" in user-facing copy, which
  `CONTEXT.md` retires; `hover:border-ring`, which is Signal Emerald — the *Passed* marker — spent on
  decoration, now Selected Row Ice (`--accent`), the token DESIGN.md §4 names for a hover tint; and
  hand-rolled route props where every other route uses the generated `PageProps`.
- **Accessibility**: the row is now one stretched link named for the Project alone rather than a link
  wrapped round the whole card (which announced name, description, Role and count as one phrase, lost
  the card's interior rhythm, and had its focus ring clipped by `overflow-hidden`); Project names are
  `h2`s, so the list has real per-item headings; and `aria-describedby` now names a field's hint as
  well as its error, so "Up to 100 characters" is not a rule only sighted people are told.
- The Role label lost its pill: `DESIGN.md` §5 reserves full curvature for status chips and badges, so
  a `rounded-full` Role was pixel-identical to a *Not Run* chip. The colour discipline was already
  right; the silhouette was not.

**Two more undeclared arrivals, now declared:** `components/ui/textarea.tsx` (the description field
needs one, and the spec's inventory listed only `alert, button, card, checkbox, input, label`), and
`lib/projects/limits.ts`, which holds the two numbers the form, the action and the migration must all
agree on. The ticket said the name rule lives in `lib/projects/messages.ts`; the strings still do.
