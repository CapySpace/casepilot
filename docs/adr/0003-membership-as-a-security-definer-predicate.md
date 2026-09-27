# Membership is a `security definer` predicate, not a policy subquery

Every row-level security policy on `projects`, `project_members` and `project_invitations` asks the
same question — "is this User a member of that Project?" — and the obvious way to ask it recurses:
a policy on `projects` that subqueries `project_members` triggers `project_members`' own policy,
which subqueries `projects`, and Postgres refuses the whole thing. So the question is asked once, by
`public.is_project_member(uuid)` and `public.is_project_owner(uuid)`: `security definer`, `stable`,
`set search_path = ''`, with `execute` revoked from `public` and `anon`. Because a definer function
runs as its owner, its read of `project_members` is not itself policed, which is what breaks the
cycle. Every policy in the phase is then one legible line.

## Consequences

- **This will look like a hole.** A function that reads `project_members` with row-level security
  suppressed, called from the policies protecting `project_members`, is exactly the shape of a
  privilege-escalation bug. It is safe because it takes a Project id and returns a boolean: it
  discloses nothing about rows the caller cannot see, and it cannot be persuaded to return someone
  else's data. Widening either function's return type — to a row, a list, a name — would turn it
  into the hole it resembles. Do not.
- **`execute` is revoked deliberately, and granted just as deliberately.** An `anon` caller has no
  business evaluating membership, and a function callable by the public key is part of the API surface
  whether or not anything in the application calls it. `authenticated` is then granted explicitly,
  rather than left to Supabase's default privileges: a policy's qualifier *does* check the function's
  ACL, so every policy in the phase depends on that grant, and an invariant every policy rests on
  should be written down rather than inherited.
- **The index is part of the decision.** `project_members (project_id, user_id)` is consulted on
  every policy evaluation of every row of every query in the phase. Dropping it as "just an index"
  would turn each read into a sequential scan per row.
- **The rejected alternative is worth remembering.** Routing every read through `security definer`
  RPCs and leaving row-level security as a blanket deny also avoids recursion — and throws away the
  thing ADR-0001 chose Supabase for, that "row-level security remains available to later phases".
  It would make "direct API access cannot bypass membership" true only because the API would be
  unusable. Releases, Builds, Cases and attempts all arrive needing the same predicate; they inherit
  two functions rather than a growing catalogue of hand-written RPCs.
- **`project_people` is the one deliberate widening**, and it is guarded by
  `is_project_member` as its first act. It exists because email lives in `auth.users`, which no
  client may read, and copying the address into `profiles` would create a second source of truth for
  it. The guard is the whole of its safety: a change to that function that moves, weakens or removes
  the membership check is a data breach, not a refactor.
