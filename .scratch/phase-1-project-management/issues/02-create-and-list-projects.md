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

- [ ] `/projects` lists every Project the signed-in User belongs to, showing name, description, their Role and the number of people in it
- [ ] Projects the User does not belong to never appear, and the page does not filter them itself
- [ ] A User with no Projects sees an empty state explaining what to do next
- [ ] `/` redirects to `/projects`, and `app/page.tsx`'s placeholder is gone
- [ ] Signing in lands on `/projects`
- [ ] `/projects/new` creates a Project from a name and an optional description, following the design's form treatment
- [ ] An empty or whitespace-only name is rejected in the browser and again in the action, with the rule stated before submission
- [ ] A name over 100 characters, or a description over 500, is rejected with a message from `lib/projects/messages.ts`
- [ ] The creator is the Owner, with no second write from the action
- [ ] Creating a Project lands the User in its workspace
- [ ] Role is rendered without status colour
- [ ] Browser tests cover creation, both validation failures, the empty state, the redirect from `/`, and that a second User's Projects are absent from the first User's list
