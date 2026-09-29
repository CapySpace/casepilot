-- Projects, Memberships and Invitations: the tenant boundary, who is inside it, and how they got
-- there.
--
-- A Project owns Releases, and transitively the Builds, Cases and Defects beneath them, so "who can
-- see this" is the phase's central question and it is answered here rather than in a page. Two
-- predicates carry every policy in the file — see ADR-0003 for why they are `security definer`, and
-- for the one rule that keeps them safe.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint projects_name_not_blank
    check (char_length(trim(name)) between 1 and 100),
  description text constraint projects_description_length check (char_length(description) <= 500),
  -- Provenance, never permission. The Owner is whoever holds the `owner` Membership, so ownership
  -- can move later without a policy changing; consulting this column for a decision would make two
  -- sources of truth for the same question, and the first transfer would break one of them.
  --
  -- `on delete restrict`, deliberately unlike `profiles`' cascade: a profile is worthless without
  -- its User, whereas a Project belongs to everybody in it and must not vanish because one row was
  -- removed. Deleting Users is not a feature of any current phase, so this fails loudly instead.
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is
  'A tenant boundary that owns Releases, and transitively the Builds, Cases and Defects beneath them. '
  'Its Owner is the holder of the owner Membership in project_members, never created_by.';

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null constraint project_members_role check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  -- A User cannot join the same Project twice, and there is exactly one Membership to remove when
  -- they leave.
  constraint project_members_one_per_user unique (project_id, user_id)
);

comment on table public.project_members is
  'One row per User per Project, carrying their Role. This is what makes a Project visible to them; '
  'removing it is what ends that.';

-- "Every Project has exactly one Owner", which CONTEXT.md states as a fact about a Project, said
-- here so that it is one. No policy in this phase can write a second owner row — none may write any
-- owner row but the creation trigger — so this guards the transfer and promotion code that later
-- phases will add, at the moment they are written rather than the moment they are noticed.
create unique index project_members_one_owner
  on public.project_members (project_id)
  where role = 'owner';

-- Not an optimisation. Every policy in this file resolves membership through this index, on every
-- row of every query, so dropping it turns each read into a sequential scan per row.
create index project_members_by_project_and_user on public.project_members (project_id, user_id);

-- The predicate every policy calls, and the reason this file has no recursive policies. A policy on
-- `projects` that subqueries `project_members` would trigger that table's own policy, which
-- subqueries `projects`, and Postgres refuses the pair outright.
--
-- `security definer` is what breaks the cycle: the function's own read of project_members is not
-- policed. That is safe for precisely one reason — it takes a Project id and returns a boolean, so
-- it can disclose nothing about rows the caller cannot see. Widening the return type to a row, a
-- list or a name would turn it into the privilege-escalation bug it resembles. See ADR-0003.
create function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project_id
      and user_id = (select auth.uid())
  );
$$;

comment on function public.is_project_member(uuid) is
  'Whether the calling User holds a Membership of that Project. Must only ever return a boolean.';

-- The grant is explicit, not inherited. Supabase's default privileges would give `authenticated`
-- EXECUTE anyway, and a policy's qual *does* check a function's ACL — so every policy in this file
-- would break the day those defaults changed, with an error about a function nobody thought they were
-- granting. Stating it costs a line.
revoke execute on function public.is_project_member(uuid) from public, anon;
grant execute on function public.is_project_member(uuid) to authenticated;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- A Project is visible to the people inside it and to nobody else. A non-member's query returns no
-- rows rather than an error, which is what lets the application answer with a 404: the truthful
-- rendering of what the database said.
create policy "Members can read their Projects"
  on public.projects for select
  using (public.is_project_member(id));

-- Anyone signed in may create a Project, but only in their own name. The `with check` is against
-- the column default, so a caller who supplies somebody else's id is refused rather than obeyed.
create policy "Users can create Projects in their own name"
  on public.projects for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Members can read the Memberships of their Projects"
  on public.project_members for select
  using (public.is_project_member(project_id));

-- Creating the Owner's Membership in a trigger rather than in the Server Action is what makes
-- "every Project has an Owner from birth" an invariant of the database instead of a promise the
-- application keeps. Two writes from an action can fail between them, and row-level security would
-- then hide the ownerless Project from everybody — including the User who had just made it.
--
-- Because this path is a trigger, `project_members` needs no insert policy at all: nothing else in
-- the phase inserts a Membership except accept_invitation, which is `security definer` too.
create function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_members (project_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

comment on function public.handle_new_project() is
  'Gives the creator the owner Membership. The only path that writes an owner row.';

revoke execute on function public.handle_new_project() from public, anon, authenticated;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();

-- The Owner predicate, the same shape and under the same rule as is_project_member: a Project id in,
-- a boolean out, nothing else ever.
create function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = p_project_id
      and user_id = (select auth.uid())
      and role = 'owner'
  );
$$;

comment on function public.is_project_owner(uuid) is
  'Whether the calling User holds the owner Membership of that Project. Must only ever return a '
  'boolean.';

revoke execute on function public.is_project_owner(uuid) from public, anon;
grant execute on function public.is_project_owner(uuid) to authenticated;

-- Only the Owner may change a Project. The `with check` repeats the `using` clause and adds nothing:
-- in particular it does not mention `created_by`, because that column is provenance and consulting
-- it here would make the policy fail for an Owner who was given the Project rather than creating it
-- — the transfer this phase defers but does not want to have designed against. Keeping the column
-- unwritable is the immutability trigger's job below, not the policy's.
create policy "Owners can update their Projects"
  on public.projects for update
  using (public.is_project_owner(id))
  with check (public.is_project_owner(id));

-- `updated_at` is the database's business, not the application's. A Server Action that forgets it is
-- a stale timestamp nobody notices; so is a write from Studio, or from a later RPC.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

-- Provenance is a record of what happened, so nothing may edit it — not an Owner, not the
-- application, not a later RPC. It refuses rather than silently restoring the old value, because a
-- write that appears to succeed and does nothing is the harder bug to find.
create function public.freeze_project_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.id is distinct from old.id then
    raise exception 'A Project''s id, creator and creation time cannot be changed';
  end if;
  return new;
end;
$$;

revoke execute on function public.freeze_project_provenance() from public, anon, authenticated;

create trigger projects_freeze_provenance
  before update on public.projects
  for each row execute function public.freeze_project_provenance();

-- An Invitation is an offer, addressed to an email address, to take up a Membership. It is issued by
-- an Owner, it expires, and it is spent when accepted.
--
-- There is no mail delivery in this phase: the Owner is handed a single-use link and sends it
-- themselves. ADR-0004 records why, and why the Invitation is nonetheless bound to the address it
-- names rather than being an unaddressed join code.
create table public.project_invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  -- Stored lower-cased so that "Peter@Example.com" and "peter@example.com" are one address to the
  -- unique index below, which cannot itself be written over an expression the application might
  -- forget to apply. The constraint refuses rather than normalising, so a caller that forgets is
  -- told.
  email text not null constraint project_invitations_email_lower_case check (email = lower(email)),
  invited_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- `expired` is deliberately absent. Expiry is a fact about `expires_at` and the clock, computed
  -- when read; storing it would need a sweep to keep true and would contradict `expires_at` for
  -- every row the sweep had not reached yet.
  status text not null default 'pending'
    constraint project_invitations_status check (status in ('pending', 'accepted', 'cancelled')),
  -- Only ever the hash. The token itself exists in the link and nowhere else, so a leaked backup
  -- yields nothing replayable. See lib/projects/invitation-token.ts.
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  -- The two facts cannot disagree: accepted means stamped, and stamped means accepted.
  constraint project_invitations_accepted_at_matches_status
    check ((status = 'accepted') = (accepted_at is not null))
);

comment on table public.project_invitations is
  'Outstanding and spent offers of Membership. Expiry is derived from expires_at, never stored.';

-- One live Invitation per address per Project: the phase spec's "cannot invite the same email
-- repeatedly while a pending invitation already exists".
--
-- The predicate cannot also say "and not expired": an index predicate must be immutable, and `now()`
-- is not. So an expired-but-pending row still occupies the slot, and the Owner's action cancels it
-- before issuing a fresh one. That is deliberate, and the reason expiry is not a dead end.
create unique index project_invitations_one_pending_per_email
  on public.project_invitations (project_id, lower(email))
  where status = 'pending';

alter table public.project_invitations enable row level security;

-- Only an Owner sees their own Project's Invitations — and *nobody* reads one by token or by
-- address, not even the person invited. Being able to ask "is there an invitation for this address"
-- would turn the table into a directory of who has been invited where. The link is spent through
-- accept_invitation, which takes a hash and returns nothing it was not given.
create policy "Owners can read their Projects' Invitations"
  on public.project_invitations for select
  using (public.is_project_owner(project_id));

create policy "Owners can invite to their own Projects"
  on public.project_invitations for insert
  to authenticated
  with check (public.is_project_owner(project_id) and invited_by = (select auth.uid()));

-- Cancelling, and only cancelling. Accepting writes a Membership in the same transaction as the
-- status change (see accept_invitation), so an Owner who could set `accepted` from here could record
-- a Membership that does not exist.
create policy "Owners can cancel pending Invitations"
  on public.project_invitations for update
  using (public.is_project_owner(project_id) and status = 'pending')
  with check (public.is_project_owner(project_id) and status = 'cancelled');

-- The state an Invitation is in, derived and never stored.
--
-- Both the preview and acceptance ask this question, and they must not answer it separately: two
-- cascades over the same three facts drift, and the drift shows up as a link the preview calls live
-- and acceptance calls expired. `stable` rather than `immutable` because it reads the clock.
create function public.invitation_state(p_status text, p_expires_at timestamptz)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_status = 'accepted' then 'accepted'
    when p_status = 'cancelled' then 'cancelled'
    when p_expires_at <= now() then 'expired'
    else 'pending'
  end;
$$;

comment on function public.invitation_state(text, timestamptz) is
  'pending, expired, accepted or cancelled. The only place expiry is decided.';

revoke execute on function public.invitation_state(text, timestamptz) from public, anon, authenticated;

-- What the acceptance page shows somebody holding a link, including a visitor with no session.
--
-- Reachable by `anon` on purpose: an invited stranger has not registered yet, and a page that cannot
-- say which Project they have been invited to cannot ask them to join it. What it discloses is
-- bounded by holding the token: one Project's name, the inviter's name, and the address the
-- Invitation was sent to — which is the address of whoever received the email in the first place.
--
-- Returns no rows for a token it does not know. Not an error: "this link is wrong" is a thing for the
-- page to say, not a fault to raise.
create function public.invitation_preview(p_token_hash text)
returns table (
  project_id uuid,
  project_name text,
  invited_by_name text,
  email text,
  state text
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    invitation.project_id,
    project.name,
    inviter.full_name,
    invitation.email,
    public.invitation_state(invitation.status, invitation.expires_at)
  from public.project_invitations as invitation
  join public.projects as project on project.id = invitation.project_id
  join public.profiles as inviter on inviter.id = invitation.invited_by
  where invitation.token_hash = p_token_hash;
$$;

comment on function public.invitation_preview(text) is
  'The acceptance screen''s data, for whoever holds the token. Callable without a session.';

revoke execute on function public.invitation_preview(text) from public;
grant execute on function public.invitation_preview(text) to anon, authenticated;

-- Spending an Invitation: validate, write the Membership, mark the Invitation accepted — one
-- transaction, so "an invitation cannot be accepted twice" holds when two clicks race rather than
-- merely usually.
--
-- The row is locked with `for update` before anything is decided, which is what serialises those two
-- clicks: the second waits, then finds a status of `accepted` and is told the link has been used. The
-- unique Membership constraint is the backstop beneath that, not the mechanism.
--
-- Every refusal is a returned outcome rather than a raised error, because each one is something a
-- person needs explaining — expired, cancelled, already used, addressed to somebody else — and an
-- exception would reach the page as a failure instead of a sentence.
create function public.accept_invitation(p_token_hash text)
returns table (project_id uuid, outcome text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation public.project_invitations;
  state text;
  caller_id uuid := (select auth.uid());
  caller_email text;
begin
  if caller_id is null then
    raise exception 'Only a signed-in User can accept an Invitation';
  end if;

  -- The address comes from the provider's own record, not from the access token: the DB is the
  -- authority on who this User is, and a claim is only ever a copy of that.
  select users.email into caller_email from auth.users as users where users.id = caller_id;

  select * into invitation
  from public.project_invitations as candidate
  where candidate.token_hash = p_token_hash
  for update;

  if not found then
    return query select null::uuid, 'not_found';
    return;
  end if;

  -- The same derivation the preview showed them, from the same function, so the page and the button
  -- cannot disagree about whether a link is still good.
  state := public.invitation_state(invitation.status, invitation.expires_at);

  if state = 'cancelled' then
    return query select null::uuid, 'cancelled';
    return;
  end if;

  if state = 'expired' then
    return query select null::uuid, 'expired';
    return;
  end if;

  -- Deliberately still naming the Project: whoever holds this link has already been told which
  -- Project it was for by the preview, and a page that can say "you have already joined this" is
  -- kinder than one that can only say "no".
  if state = 'accepted' then
    return query select invitation.project_id, 'used';
    return;
  end if;

  if lower(caller_email) is distinct from invitation.email then
    return query select null::uuid, 'wrong_address';
    return;
  end if;

  if exists (
    select 1
    from public.project_members as existing
    where existing.project_id = invitation.project_id
      and existing.user_id = caller_id
  ) then
    -- The Invitation stays pending rather than being quietly spent: it was never accepted, and saying
    -- it was would be a false record. The Owner sees it outstanding and can cancel it, which is also
    -- what frees the address — and the invite action refuses to invite an existing Member in the
    -- first place, so this branch is the narrow case of somebody who joined between the two events.
    return query select invitation.project_id, 'already_member';
    return;
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (invitation.project_id, caller_id, 'member');

  update public.project_invitations
  set status = 'accepted', accepted_at = now()
  where id = invitation.id;

  return query select invitation.project_id, 'accepted';
end;
$$;

comment on function public.accept_invitation(text) is
  'Validates and spends an Invitation, writing the Membership in the same transaction. Returns an '
  'outcome for every refusal rather than raising.';

revoke execute on function public.accept_invitation(text) from public, anon;
grant execute on function public.accept_invitation(text) to authenticated;

-- The Members list: who is in a Project, what they are called, how to reach them.
--
-- This is the one deliberate widening of the definer pattern, and the membership check on its first
-- line is the whole of its safety. A change that moves, weakens or removes that check is a data
-- breach and not a refactor — see ADR-0003.
--
-- It exists because the two halves of a person live in two places a client cannot join: `profiles`
-- is readable only by its own User, and the email address is in `auth.users`, which no client may
-- read at all. Copying the address into `profiles` was the alternative, and it was rejected — it
-- would make a second source of truth for an address the provider already owns.
create function public.project_people(p_project_id uuid)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  joined_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    membership.user_id,
    person.full_name,
    account.email,
    membership.role,
    membership.joined_at
  from public.project_members as membership
  join public.profiles as person on person.id = membership.user_id
  join auth.users as account on account.id = membership.user_id
  where membership.project_id = p_project_id
    -- Not a decoration. Without this the function hands anybody the name and address of everybody in
    -- any Project whose id they can guess or read from a URL.
    and public.is_project_member(p_project_id)
  -- The Owner first, then in the order people joined.
  order by (membership.role = 'owner') desc, membership.joined_at, account.email;
$$;

comment on function public.project_people(uuid) is
  'Name, address, Role and joined date for everybody in a Project. Returns nothing unless the caller '
  'is a member of it — that check is the whole of its safety.';

revoke execute on function public.project_people(uuid) from public, anon;
grant execute on function public.project_people(uuid) to authenticated;
