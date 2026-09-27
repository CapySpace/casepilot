# Phase 1 — Project Management

Status: ready-for-agent

## Problem Statement

CasePilot can tell one User from another and nothing else. A User registers, verifies their address,
signs in, and lands on a page that says there is nothing here — because there is not. The
authenticated area is a placeholder with a sign-out button, and `app/page.tsx` says so in a comment
that tells whoever arrives next to replace it.

Everything the product is for hangs off a Project: Cases belong to one, Builds belong to one,
attempt history is only meaningful inside one, and every one of those things is shared by the people
testing together. Until a Project exists there is nowhere to put a Case, and until Users can be
invited into one there is no reason for CasePilot to be multi-User at all. The tenant boundary is
also the security boundary: a Project holds a company's defect data, so "who can see this" has to be
answered by the database and not by the interface.

## Solution

A signed-in User creates a Project with a name and an optional description, and becomes its Owner in
the same breath — the database sees to that, not the application. `/projects` lists every Project
they belong to, with their Role and how many people are in it, and is where signing in now lands.
Opening one enters the workspace: a persistent sidebar, an overview, a Members list, and settings.

The Owner invites colleagues by email address. CasePilot records the Invitation and hands the Owner a
single-use link to send however they like; there is no mail delivery in this phase and none is
pretended. Following the link shows who invited you and to what; accepting it creates the Membership
and the Project appears on your list. Someone who has never heard of CasePilot can follow the link,
register, verify their address, and land back on the invitation exactly where they left it.

A Member can see the Project, see who else is in it, and leave. An Owner can additionally edit the
Project, invite, cancel a pending Invitation, and remove a Member. Nobody else can see that the
Project exists at all: access is decided by row-level security, and a non-member asking for a
Project by URL gets the same answer as for a Project that never existed.

## User Stories

### Creating a Project

1. As a signed-in User, I want to create a Project with a name, so that I have somewhere to keep a team's Cases.
2. As a signed-in User, I want to add an optional description, so that colleagues joining later know what the Project is for.
3. As a signed-in User, I want to be stopped from creating a Project with an empty or whitespace-only name, so that my list does not fill with unnameable rows.
4. As the User who created a Project, I want to be its Owner automatically, so that I can invite people without a further setup step.
5. As a User who has just created a Project, I want to land in its workspace, so that creating and using it are one motion.
6. As a User, I want a Project I created to exist with an Owner or not at all, so that a failure halfway through cannot leave a Project nobody can reach.

### The Projects list

7. As a signed-in User, I want to see every Project I belong to, whether I created it or was invited, so that I have one place to start from.
8. As a signed-in User, I want each entry to show my Role and how many people are in the Project, so that I can tell at a glance where I stand.
9. As a signed-in User, I want Projects I do not belong to to be absent — not greyed out, not listed — so that the list cannot be used to learn what other teams are working on.
10. As a User with no Projects yet, I want the empty list to explain what to do, so that a first sign-in is not a dead end.
11. As a signed-in User, I want signing in to take me to my Projects, so that I do not land on a page with nothing on it.

### The Project workspace

12. As a Member of a Project, I want to open it and see its name, description and how many people are in it, so that I know I am in the right place.
13. As a Member of a Project, I want a persistent sidebar, so that moving between overview, Members and settings does not mean hunting for links.
14. As a Member of several Projects, I want to switch between them from the sidebar, so that changing context is one action.
15. As a Member, I want the URL to name the Project I am looking at, so that I can bookmark it, share it with a colleague, and open two Projects in two tabs.
16. As a Member, I want to be told plainly that Releases, Builds and Cases are not here yet, so that I do not think the product is broken.

### Editing a Project

17. As an Owner, I want to change my Project's name and description, so that a Project can be renamed as its scope becomes clear.
18. As an Owner, I want the same name rules when editing as when creating, so that I cannot edit a Project into an invalid state.
19. As a Member who is not the Owner, I want no editing controls at all rather than disabled ones, so that the interface does not offer me things I cannot do.

### Members

20. As a Member of a Project, I want to see everyone in it with their name, email address, Role and when they joined, so that I know who I am working with and how to reach them.
21. As a Member, I want Roles shown accurately, so that I know who to ask when something needs changing.
22. As a User, I want my name and address visible only to people who share a Project with me, so that membership of one Project does not expose me to the whole installation.

### Invitations

23. As an Owner, I want to invite a colleague by email address, so that they can join without me creating an account for them.
24. As an Owner, I want a link I can copy and send myself, so that inviting someone does not depend on CasePilot delivering mail it cannot yet deliver.
25. As an Owner, I want to see which Invitations are still outstanding, so that I know who has not joined yet.
26. As an Owner, I want to be stopped from inviting the same address twice while an Invitation is still waiting, so that a colleague does not receive three links for one Project.
27. As an Owner, I want to be able to invite an address again once its Invitation has expired, so that expiry is a delay and not a permanent block.
28. As an Owner, I want to cancel a pending Invitation, so that a link sent to a mistyped address stops working.
29. As an Owner, I want to invite someone who has no CasePilot account yet, so that I am not blocked by whether they have registered.
30. As a User, I want an Invitation I was not sent to be useless to me, so that a forwarded link cannot put a stranger inside my team's Project.

### Accepting an Invitation

31. As an invited person, I want the link to tell me which Project I have been invited to and by whom, so that I can decide whether to accept.
32. As an invited person without an account, I want to register and then arrive back at the invitation, so that joining is one continuous flow rather than two disconnected ones.
33. As an invited person with an account, I want to sign in and arrive back at the invitation, so that I do not have to find the link again afterwards.
34. As an invited person, I want to accept explicitly, so that a mail client's link scanner cannot join me to a Project on my behalf.
35. As a person who has accepted, I want to land in the Project, and to find it on my list afterwards, so that acceptance visibly worked.
36. As a person whose Invitation has expired, I want to be told so and told to ask for another, so that I know the link was time-limited rather than wrong.
37. As a person following a link that has already been used, I want a clear explanation rather than a second Membership or an error page, so that a stale link in my inbox is not alarming.
38. As a person already in the Project, I want following an Invitation to say so plainly, so that I am not left wondering whether anything happened.
39. As a signed-in User holding an Invitation addressed to a different address, I want to be told which address it was sent to, so that I can sign in as the right person.
40. As an Owner, I want an accepted Invitation to be spent, so that the same link cannot be replayed by whoever else has seen the email.

### Leaving and removing

41. As a Member who is not the Owner, I want to leave a Project, so that I stop seeing work that is no longer mine.
42. As a Member leaving a Project, I want to confirm first, so that I do not lose access to a shared workspace by misclicking.
43. As a User who has left, I want to be returned to my Projects list and to find the Project gone from it, so that the outcome is unambiguous.
44. As an Owner, I want to remove a Member, so that someone leaving the team stops seeing the Project.
45. As an Owner, I want to confirm before removing someone, so that a misclick does not cut a colleague off mid-test.
46. As a removed Member, I want the Project to be genuinely gone rather than merely hidden, so that its URL does not still work.

### Access control

47. As a Member, I want Project data reachable only by people in the Project, enforced by the database, so that a bug in a page cannot leak it.
48. As a non-member, I want a Project's URL to tell me nothing — not even that it exists — so that Project identifiers cannot be used to map other teams.
49. As a User, I want the API to refuse what the interface refuses, so that calling Supabase directly is not a way round membership.
50. As a User, I want a removed Membership to end access immediately, so that leaving or being removed takes effect at once.

## Implementation Decisions

Every decision below was settled in a grilling session before any code was written; the questions
and the rejected alternatives are that session's record, and the two decisions that fail neither the
hard-to-reverse nor the surprising test have ADRs of their own.

**Vocabulary is settled in `CONTEXT.md`**, which gained **Membership**, **Role** and **Invitation**
during that session. A *Membership* joins one User to one Project and carries their Role; *Role* is
`Owner` or `Member`; an *Invitation* is addressed to an email address, expires, and is spent when
accepted. The glossary's old blanket ban on "member" is narrowed: **Member is a Role, never a person
in general**. A person is a User. The interface says "Members" because that is the plainest word for
the people holding a Membership of one Project.

**Phase numbering.** This is Phase 1 — Project Management, at
`.scratch/phase-1-project-management/`, alongside `.scratch/phase-1-auth/`. The authentication spec's
prose no longer numbers the phase that follows it: it says "the next phase", which is true under any
scheme and stops the two Phase 1s contradicting each other.

**The active Project is the URL, and nothing else.** `/projects` lists them; `/projects/new` creates
one; `/projects/[projectId]` is the workspace, with `members` and `settings` beneath it. There is no
stored "current Project" on the profile and none in a cookie. Persisted active-Project state makes
every URL non-shareable, breaks two tabs on two Projects, and makes a page's meaning depend on state
nobody can see. `CONTEXT.md` says the same thing in domain terms: work happens in one Project at a
time, and which one is evident from where the User is rather than remembered on their behalf.

**`/` redirects to `/projects`,** and the placeholder in `app/page.tsx` is deleted — its own comment
asked for exactly that. The `DESIGN.md` sidebar is a *Project* shell: its `WORKSPACE` eyebrow, its
per-Project counts, its navigation towards Releases and Builds. It therefore lives in the
`[projectId]` layout, not globally, because rendering it above a list of Projects would mean
inventing an empty variant of every part of it.

**Ownership lives in the Membership, not in `created_by`.** The Membership row's Role is the only
authority for any decision. `created_by` is provenance — displayable, never consulted for permission
— which is what will let ownership be transferred later without touching a single policy. Two
sources of truth for "is this person the Owner" is the bug that bites the first time it moves.

**The creator's Membership is written by a trigger on `projects` insert**, mirroring
`handle_new_user`. "Every Project has an Owner from birth" is then an invariant of the database
rather than a promise the action keeps: two writes from a Server Action can fail between them, and
row-level security would hide the resulting ownerless Project from everyone, including the person who
just made it. `created_by` defaults to `auth.uid()`. This path needs no insert policy on
`project_members` at all.

**Membership is a `security definer` predicate** — `public.is_project_member(uuid)` and
`public.is_project_owner(uuid)`, `stable`, `set search_path = ''`, `execute` revoked from `public`
and `anon` — called by every policy on all three tables. Policies that subquery each other the
obvious way recurse infinitely and Postgres refuses them. See ADR-0003. An index on
`project_members (project_id, user_id)` is part of this decision, not an optimisation: every policy
evaluation goes through it.

**The Members list reads through `public.project_people(p_project_id uuid)`**, a `security definer`
function returning `(user_id, full_name, email, role, joined_at)` that yields nothing unless the
caller is a member. Email exists only in `auth.users`, which no client can read, and `profiles` is
readable only by its own User. Copying the address into `profiles` was rejected: the `profiles`
migration keeps the full name there because "provider metadata is not joinable in SQL", and email in
`auth.users` *is* joinable in SQL from exactly this kind of function, so a copy buys nothing and
costs a drift bug the day a change-email feature exists.

**Invitations are links, bound to an address.** The Owner submits an email address; CasePilot stores
the Invitation and shows a single-use link to send by whatever means the Owner already has. There is
no mail delivery in this phase. Supabase's admin invite API was not an option: it needs the secret
key in the application runtime, which `tests/unit/secret-key-containment.test.ts` forbids, and it
inserts into `auth.users` without a `full_name`, which the profile trigger rejects with an opaque
`unexpected_failure` — precisely the failure ADR-0001 predicted for "any future invite path". See
ADR-0004. Acceptance requires the signed-in User's address to equal the Invitation's, compared
case-insensitively, so forwarding the link achieves nothing.

**Token handling.** 32 random bytes, base64url, generated in the action and present only in the link.
The database stores `token_hash` — SHA-256 hex, unique — and never the token. Acceptance runs through
`public.accept_invitation(p_token_hash text)`, a `security definer` function that validates, inserts
the Membership and marks the Invitation accepted in one transaction, so "cannot be accepted twice"
holds under two simultaneous clicks rather than usually. `public.invitation_preview(p_token_hash
text)` returns the Project name, the inviter's name and the invited address for the acceptance
screen. `project_invitations` has **no select policy for the invited person**: only an Owner may list
their own Project's Invitations, so nobody can probe whether an address has been invited anywhere.

**The invitation URL is public, via an anchored pattern.** `lib/auth/routes.ts` matches exactly and
never by prefix, on purpose — "a prefix would make `/sign-in-internal-admin` public". A token-bearing
path cannot join that set, so the module gains a second, small list of **anchored** regular
expressions (`^/invitations/[A-Za-z0-9_-]{43}$`) checked alongside it, with unit tests enumerating
what it must refuse. Signed out, the invitation page shows the Project and offers sign-in or
registration, each carrying `?next=/invitations/<token>`; registration prefills the invited address.
`safeNext()` already permits any same-origin path with its query string, so the destination survives
the verification round trip with no new machinery. Acceptance is **never automatic**: joining a
Project is consent, and a prefetch or a mail scanner would otherwise spend the token.

**Expiry is derived, not stored.** Stored status is `pending | accepted | cancelled` under a check
constraint; an Invitation is expired when `expires_at` has passed, computed at read time. A stored
`expired` needs a sweep — a scheduled component this phase does not otherwise need — and contradicts
`expires_at` for every row the sweep has not reached. Lifetime is seven days. A partial unique index
on `(project_id, lower(email)) where status = 'pending'` enforces one live Invitation per address; the
expired-but-pending case is handled in the action, which cancels the stale row and issues a fresh
one, because an index predicate may not mention `now()`.

**Constraints.** `projects.name` `check (char_length(trim(name)) between 1 and 100)`;
`description` nullable, `check (char_length(description) <= 500)`; no uniqueness on name, because two
companies may both run "Mobile Banking App" and even one User may legitimately have two.
`project_members`: `unique (project_id, user_id)`, `role check in ('owner','member')`, `user_id`
`on delete cascade`. `project_invitations`: `on delete cascade` from `projects`, `email` stored
lower-cased. `projects.created_by` is `not null references auth.users(id) on delete restrict` — a
deliberate divergence from `profiles`' cascade: a profile is worthless without its User, whereas a
Project belongs to everybody in it and must not vanish because one row was removed. Deleting Users is
not a feature of any current phase, so failing loudly is the right answer. `updated_at` is maintained
by a trigger, never by the application, so a write from Studio or a later RPC cannot forget it.

**A non-member gets a 404.** `lib/projects/dal.ts` adds `requireProjectMembership(projectId)` and
`requireProjectOwnership(projectId)` on top of `verifySession()`, and both call `notFound()` rather
than redirecting or rendering "forbidden". "This Project exists but is not yours" is itself a
disclosure, and row-level security returns zero rows either way, so the 404 is the truthful rendering
of what the database said.

**Page contents follow the Role.** *Overview*: name, description, Member count, created date, and an
honest note that Releases and Builds arrive next. *Members*: the list, for everyone in the Project;
the invite form and the pending-Invitation list for the Owner only. *Settings*: the edit form for the
Owner, **Leave Project** for a Member. Both Roles therefore have a reason to open Settings and each
sees only what applies — the Owner sees no Leave button at all, not a disabled one, because a control
you cannot use is worse than an absent one.

**Destructive actions confirm in an `alert-dialog`.** Leaving, removing and cancelling each open a
shadcn `alert-dialog` (a new component; only `alert, button, card, checkbox, input, label` are
installed) whose confirm button is a real form submitting to a Server Action. **This is a documented
step back from Phase 1's no-JavaScript property**: sign-out was deliberately "a plain form, so
signing out works whether or not the client bundle has loaded", and opening a dialog needs the
bundle. `DESIGN.md` specifies modals — Level 3 elevation, `rounded-3xl` — so they are in the design
language, and later phases need the component for recording attempts anyway. The alternative, a
confirmation page per action, buys no-JavaScript confirmation at the cost of three routes and a
navigation.

**The copyable link is assembled in the browser.** The server produces a path; a small client
component builds `${window.location.origin}${path}` at copy time. `app/auth/confirm/route.ts` refuses
to build absolute URLs because `request.nextUrl.origin` derives from a caller-supplied Host header,
and that reasoning holds here. No `NEXT_PUBLIC_SITE_URL` is introduced; there is no new value to get
wrong in CI or production.

**Messages live in `lib/projects/messages.ts`**, a sibling of the auth catalogue under the same
discipline: nothing formats a message inline, and an unrecognised failure still produces something
sensible. `lib/auth/messages.ts` declares itself the single source of every *authentication* message
and is left alone.

**Framework reality.** This is Next.js 16 on the App Router, and it is not the Next.js in anyone's
training data. Dynamic segments, layouts and Server Actions must be written against the guides in
`node_modules/next/dist/docs/` — read them before writing a `[projectId]` page, not after. Request
interception is `proxy.ts`, not `middleware.ts`, and remains default-deny.

## Testing Decisions

**The two seams from Phase 1 stand, and a third joins them.** The browser remains primary: end-to-end
tests drive the real application against the real local stack, and the provider is never mocked.
Pure functions remain the narrow second seam — the public-path patterns, name validation, the message
catalogue.

**The third seam is the database, reached the way an attacker would.** Your acceptance criterion
"direct API access cannot bypass membership restrictions" cannot be honestly met from the browser: a
browser test that types someone else's Project URL exercises the DAL and the proxy and says nothing
about row-level security. So a Vitest suite talks to Supabase over the **publishable key** as two
real signed-in Users and asserts that Anna cannot select Peter's Project, cannot insert herself into
`project_members`, cannot update his `projects` row, cannot read his Invitations, and cannot accept an
Invitation addressed elsewhere. This tests the policies, not the pages, which is exactly why it
cannot live with the page tests. It ships in ticket 01, beside the policies it describes — a policy
written today and tested in ticket 07 is a policy nobody re-reads.

**What a good test asserts here** is unchanged from Phase 1: what a User could observe, or what the
API returns. Not the shape of a row, not which function called which. The RLS suite is the one place
that reads raw API responses, and it does so because the API response *is* the observable behaviour
being specified.

**Seeding.** `tests/support/users.ts` already mints real Users through the admin API; Projects and
Memberships are created **through the application** in browser tests and **through the API as the
owning User** in the RLS suite. No administrative back door writes a Membership, because a Membership
written by the secret key would not prove the policies allow the real one.

## Out of Scope

- **Releases, Builds, Cases, attempts and reports.** A Project is where they will live; none of them
  exists yet, and the overview says so rather than drawing an empty frame for them.
- **Transferring ownership, and deleting or archiving a Project.** Both need their own confirmation
  design and a "last Owner" invariant. The consequence is accepted and documented rather than hidden:
  **an Owner cannot leave their own Project in this phase**, and there is no way to get rid of one.
  Nobody's Project has data in it yet, which is what makes that survivable now and not later.
- **Changing an existing Member's Role.** Invite as, remove, re-invite.
- **Resending an Invitation.** Cancel and invite again.
- **Email delivery of Invitations**, and any transactional mail provider, template or secret. The
  Invitation record is shaped so that adding delivery later is one call beside the insert.
- **Notifying anyone of anything**: not the Owner when someone accepts, not a Member when they are
  removed.
- **Project-level roles beyond Owner and Member**, and any per-feature permission model.
- **Anything deploy-related.** No hosted Supabase project, no production URLs, no CI secrets.
- **Search, sorting, pagination or filtering** of Projects or Members. A list is a list at this size.
- **Avatars.** `project_people` returns a name and an address; drawing initials from the name is a
  design detail, not a data one.

## Further Notes

**Vocabulary check before writing copy.** Read `CONTEXT.md` first. "Workspace" is retired in favour
of Project, which means the `DESIGN.md` sidebar's `WORKSPACE` eyebrow becomes `PROJECT` — the design
predates the glossary and loses on this point. A Case is always a *test* case.

**Design tokens are not optional.** `DESIGN.md` is the design system and its tokens are already wired
into `app/globals.css` and `components/ui/`. Use `bg-primary`, `text-muted-foreground`, `gap-lg`,
`rounded-xl`, `text-headline-md` — never a hex value and never `h-[44px]`. Colour means status and
status alone, which matters here: a Role is **not** a status, so `Owner` and `Member` are set in type
or a neutral `Whisper Periwinkle` chip, never in the emerald/crimson status scale. The first
temptation of this phase is a green "Owner" badge; that badge would lie.

**The Owner dead end is real.** An Owner who wants out has no route out. If that turns out to bite
during the phase, the fix is transferring ownership as its own ticket, not a special case bolted onto
leaving.

**Two ADRs accompany this spec:** ADR-0003 on the membership predicate, ADR-0004 on Invitations as
address-bound links. Both record decisions that will look wrong at first glance — a `security
definer` function reading the table its policies guard, and an invitation feature that sends no
email.
