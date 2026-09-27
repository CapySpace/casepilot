# 01: Schema, access control and the direct-API suite

**What to build:** One migration that creates `projects`, `project_members` and
`project_invitations`, the two membership predicates every policy calls, the triggers that make the
Project's invariants the database's business, the two Invitation functions, and the read function the
Members list needs — plus the test suite that proves a non-member is refused by the database itself.

The predicates are the heart of it. `public.is_project_member(uuid)` and
`public.is_project_owner(uuid)` are `security definer`, `stable`, `set search_path = ''`, with
`execute` revoked from `public` and `anon`, and every policy on all three tables calls one of them.
Policies that subquery each other directly recurse and Postgres refuses them; ADR-0003 records why
this shape is safe and what would make it unsafe. Neither function may ever be widened to return
anything but a boolean.

The creator's `owner` Membership is written by a trigger on `projects` insert, exactly as
`handle_new_user` writes a profile, so "every Project has an Owner from birth" is an invariant rather
than a promise. `created_by` defaults to `auth.uid()` and is provenance only — the Membership's Role
is the sole authority for permission. `updated_at` is maintained by a trigger too, so nothing that
writes a row can forget it.

Invitations store only `token_hash`, never the token. `accept_invitation(p_token_hash)` validates,
inserts the Membership and marks the Invitation accepted in one transaction; `invitation_preview`
returns the Project name, the inviter's name and the invited address. There is deliberately no select
policy letting an invited person read `project_invitations` — only an Owner lists their own Project's
Invitations — so no one can probe whether an address has been invited anywhere. `project_people`
returns name, email, Role and joined date, and its first act is the membership check that is the whole
of its safety.

The RLS suite ships here rather than in a later ticket, because a policy written today and tested in
ticket 07 is a policy nobody re-reads. It talks to Supabase over the **publishable key** as two real
signed-in Users, which is how an attacker would, and asserts what the database refuses.

Write the migration's comments the way `20260927000000_profiles.sql` writes them: state what the
alternative was and why it lost. The partial unique index in particular needs to say why the expired
case is handled in an action instead — an index predicate may not call `now()`.

**Blocked by:** nothing.

**Status:** ready-for-agent

- [ ] `projects` exists with `id`, `name`, `description`, `created_by`, `created_at`, `updated_at`, a name check of 1–100 characters after trimming, a description check of 500, and no uniqueness on name
- [ ] `created_by` is `not null references auth.users(id) on delete restrict`, and the migration comment says why this diverges from `profiles`' cascade
- [ ] `project_members` exists with `unique (project_id, user_id)`, a `role` check of `owner`/`member`, `joined_at`, `user_id` cascading on User deletion, and an index on `(project_id, user_id)`
- [ ] `project_invitations` exists with `project_id`, lower-cased `email`, `invited_by`, `status` checked against `pending`/`accepted`/`cancelled`, `token_hash` unique, `expires_at`, `created_at`, `accepted_at`, and a partial unique index on `(project_id, lower(email)) where status = 'pending'`
- [ ] `is_project_member` and `is_project_owner` are `security definer`, `stable`, `search_path`-pinned, revoked from `public` and `anon`, and return only a boolean
- [ ] Row-level security is enabled on all three tables, and every policy is expressed through those predicates
- [ ] A signed-in User may insert a Project only with themselves as `created_by`
- [ ] A trigger writes the creator's `owner` Membership on insert, and `project_members` has no insert policy for that path
- [ ] A trigger maintains `updated_at` on `projects`
- [ ] `project_people(p_project_id)` returns name, email, Role and joined date for members only, and nothing at all to a non-member
- [ ] `invitation_preview(p_token_hash)` returns the Project name, inviter name and invited address, and distinguishes pending, expired, accepted and cancelled
- [ ] `accept_invitation(p_token_hash)` validates address, expiry, status and existing Membership, then inserts the Membership and marks the Invitation accepted in one transaction
- [ ] Accepting the same Invitation twice creates exactly one Membership, including when the two attempts race
- [ ] A direct-API suite, as two real Users over the publishable key, proves a non-member cannot select a Project, insert their own Membership, update the Project, read its Invitations, or accept an Invitation addressed to someone else
- [ ] Migration comments state the alternatives that lost, in the style of the profiles migration

## Comments

**One unexplained failing run, not reproduced.** While building the suite, a single run reported two
failures out of 49; every run since — nine of them, including two suites concurrently, and one after
`supabase db reset` — has passed, and the failing run's output was not captured. The mechanism I can
name is `[auth.rate_limit] sign_in_sign_ups`, which defaults to 30 in five minutes per IP while this
suite signs in about eighty times per run; the local stack does not appear to enforce it for password
sign-ins, so the limit has been raised as a precaution rather than as a diagnosed fix. If a run fails
again, capture the output before re-running: this repo's rule is that a test which only passes on a
retry gets fixed, not retried, and this one is currently a rule with no evidence attached.

**What deliberately arrived early, and why.** Three things in this ticket's migration belong to later
tickets' features and are here anyway, because a migration is one artefact and splitting a policy set
across two of them is how policies stop being reviewable together:

- the `projects` update policy, which ticket 03 builds the Settings form on top of;
- the `project_invitations` cancel policy, which ticket 05 builds the cancel control on top of;
- the tests for both, which are those tickets' acceptance evidence arriving with the policy rather than
  two tickets later.

Two things here were asked for by nothing, and are judgement calls a reviewer should feel free to
reverse:

- **`freeze_project_provenance`**, a trigger making `id`, `created_by` and `created_at` unwritable. The
  ticket says `created_by` "is provenance only"; this makes that enforceable rather than a convention,
  and it replaced a first attempt that put `created_by = auth.uid()` in the update policy's `with
  check` — which would have consulted provenance for permission and locked out a transferred Owner.
- **`project_members_one_owner`**, a partial unique index. `CONTEXT.md` states "every Project has
  exactly one Owner" as a fact about a Project; nothing in this phase could write a second owner row,
  but a glossary fact that the schema does not hold is a fact waiting to stop being true.

**A finding worth carrying into ticket 02.** A Project cannot be read back from its own `INSERT`. The
SELECT policy is applied to the `RETURNING` row while the statement runs, before the AFTER trigger has
written the Owner's Membership, so the creator is not yet a member of their own Project at that instant
and PostgREST answers `42501`. The creating action must therefore generate the id itself
(`crypto.randomUUID()`) and redirect to it, rather than asking the database for it.
