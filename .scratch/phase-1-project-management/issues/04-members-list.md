# 04: The Members list

**What to build:** `/projects/[projectId]/members`, showing everyone in the Project with their display
name, email address, Role and the date they joined — read through `project_people` from ticket 01.

This page is why `project_people` exists. `profiles` is readable only by its own User and holds no
email at all; the address lives in `auth.users`, which no client may read. The function joins the two
behind a membership check, so a name and an address are visible to the people who share a Project with
you and to nobody else. Do not reach around it, and do not add an email column to `profiles` — the
reasoning is in the spec and in ADR-0003.

Every Member sees the list; this is not an Owner-only page. The invite form and the pending
Invitations belong to ticket 05 and appear here for the Owner alone.

Roles carry no status colour, for the same reason as the Projects list: colour means status, and a
Role is not one.

**Blocked by:** 03.

**Status:** ready-for-agent

- [x] Every Member of a Project can open the Members page and see everyone in it
- [x] Each row shows display name, email address, Role and joined date
- [x] The data comes from `project_people`; nothing queries `profiles` or `auth.users` directly
- [x] A non-member gets the same 404 as everywhere else in the Project
- [x] Calling `project_people` for a Project you do not belong to returns nothing, proven in the direct-API suite
- [x] Roles render without status colour, consistent with the Projects list
- [x] The Owner is distinguishable from Members at a glance
- [x] Browser tests cover a Member seeing both people after an invitation has been accepted, and the joined dates being present and plausible

## Comments

**Two things became shared rather than copied, both on their second use.**

- **`RoleLabel`** (`app/projects/_components/role-label.tsx`). The Projects list and the Members list
  both show a Role, and they have to agree: a Role that is a quiet label on one screen and something
  louder on another reads as two different facts. It also keeps the two rules in one place — no status
  colour, and no pill, since `DESIGN.md` reserves full curvature for the chips that show execution
  state.
- **`formatDay`** (`lib/dates.ts`). The overview's created date and the Members list's joined dates are
  the same kind of fact and now the same string. It spells the month, because `27/09/2026` and
  `09/27/2026` are one string to a machine and opposite facts to a reader.

**A failing test found a real timezone decision.** `formatDay` is pinned to UTC. Without that the day
depends on the timezone of whatever rendered it — these pages are server-rendered, so a deployment in
one region and a reader in another would disagree about when somebody joined, and two deployments would
disagree with each other. A timestamp near midnight can therefore read a day out for somebody far from
UTC, which is the smaller problem and the one that stays the same every time it is read.

**The joined date is in the row twice, deliberately.** As a column on wide screens, and inside the name
cell on narrow ones where the column is dropped. `DESIGN.md` §5 says dense tables become vertical card
stacks on mobile; this is the cheap version of that — the fact stays visible rather than the table
scrolling sideways.

**Nothing about the email address is new.** It comes from `project_people`, whose membership check is the
whole of its safety, and the direct-API suite from ticket 01 already proves it returns nothing to
somebody outside the Project. No column was added to `profiles`, as the ticket and ADR-0003 both ask.

**The nav lost its note about Members arriving later**, because Members has arrived. Releases, Builds and
Cases are still absent from it for the same reason as before: a navigation item that goes nowhere is
worse than a short list.

**What the review changed.**

- **One number had two sources.** The heading's count came from the Membership aggregate while the rows
  came from `project_people`, which inner-joins `profiles` and `auth.users` — so a Membership whose
  profile row was missing would have been counted above a list that did not contain it. The count is now
  `people.length`: a restatement of the rows rather than a second claim about them.
- **The guard runs before the question.** The page awaited membership and the people list together.
  `project_people` guards itself, and ADR-0003 says that check is "the whole of its safety" — which is
  exactly the argument for not making it the only line. Deciding membership first costs no query, because
  the layout has already resolved it and `cache` dedupes within the request.
- **"Distinguishable at a glance" was only distinguishable by reading.** Owner and Member had identical
  containers and differed by a word. The Owner's label is now filled and bolder, a Member's outlined and
  lighter — weight and fill, never colour, since the status scale means execution state alone and a green
  Owner would claim a verdict about the Project.
- **A date assertion was reading the wrong copy.** Playwright reads text content including
  `display:none` nodes, so asserting the date on the *row* passed on the narrow-screen duplicate hidden
  inside the name cell. It now asserts the Joined **cell**, and that it is visible — and a second test at
  390px proves the column drops and the date moves into the row rather than off it.
- **`md:`, not `sm:`.** DESIGN.md §5 puts the end of mobile at 767px; Tailwind's `sm:` would have dropped
  the column 127px early — the same mistake the sidebar's `desktop:` token exists to avoid.
- **The header is deliberately not sticky**, and the doc comment no longer claims DESIGN.md §4's
  treatment whole. Sticky needs something that scrolls; a handful of people in a card that does not
  scroll would make the class a claim the markup cannot honour. §4's sticky header belongs with the
  Cases table of a later phase, which will have the rows and the scroll container to justify it.
- **Row headers**: the name is a `<th scope="row">`, so a screen reader announces whose Role and date it
  is reading, and the table is tied to the page heading with `aria-labelledby`.
- **A reviewer claim I checked and rejected**: that `.returns<PersonRow[]>()` would replace the cast in
  `listProjectPeople`. Measured against @supabase/supabase-js 2.117 it does not compile on `rpc()` — the
  helper unions the row type with a `{ Error: "Type mismatch: Cannot cast single object to array type…" }`
  marker, so `.map` does not exist on the result. Without generated database types the client cannot know
  a function returns a set. The cast stays, with the measurement in the comment.
