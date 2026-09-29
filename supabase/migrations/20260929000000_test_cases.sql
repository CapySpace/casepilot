-- Test Cases: what a Build's testers mean to verify — the first data in this schema that describes
-- intent rather than an already-happened fact.
--
-- CONTEXT.md and ADR-0005: a Case belongs to the Build it was written for, not its Release or Project.
-- TC-nnn is unique within its Build, and nothing carries forward when a new Build is produced. Every
-- policy reuses is_project_member from the projects migration, reached through a new build_project_id
-- bridge — the same shape release_project_id already set for Builds themselves.
--
-- As with releases and builds, there is no Owner-only policy anywhere in this file: any Member may
-- create, edit or delete a Case — "delete" being an UPDATE, never a Postgres DELETE, explained below.

-- A CHECK constraint cannot itself contain a subquery, so the steps' shape is validated by this
-- function instead: an array of at most 50 objects, each with a non-blank `action` of 1-500 characters
-- and an optional `expectedResult` of at most 500 characters. An empty array is valid — a Case may be
-- created with no steps yet. Order is the array's own position; there is no separate ordinal field.
create function public.test_case_steps_are_valid(steps jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(steps) = 'array'
    and jsonb_array_length(steps) <= 50
    and coalesce(
      (
        select bool_and(
          jsonb_typeof(step) = 'object'
          and step ? 'action'
          and jsonb_typeof(step -> 'action') = 'string'
          and char_length(trim(step ->> 'action')) between 1 and 500
          and (
            not (step ? 'expectedResult')
            or step ->> 'expectedResult' is null
            or (
              jsonb_typeof(step -> 'expectedResult') = 'string'
              and char_length(step ->> 'expectedResult') <= 500
            )
          )
        )
        from jsonb_array_elements(steps) as step
      ),
      true
    );
$$;

comment on function public.test_case_steps_are_valid(jsonb) is
  'Whether a steps payload is a JSON array of at most 50 well-formed step objects. Used only in '
  'test_cases_steps_shape; must depend on nothing but its argument.';

revoke execute on function public.test_case_steps_are_valid(jsonb) from public, anon;
grant execute on function public.test_case_steps_are_valid(jsonb) to authenticated;

create table public.test_cases (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds (id) on delete cascade,
  -- Assigned by assign_test_case_code below, never by the caller.
  code text not null constraint test_cases_code_format check (code ~ '^TC-[0-9]+$'),
  title text not null constraint test_cases_title_not_blank
    check (char_length(trim(title)) between 1 and 200),
  -- Optional, but once started must say something: a whitespace-only value would render as a section
  -- with nothing in it. No `is null or` guard needed — a NULL fails neither check, the same reading
  -- `releases.name` already relies on.
  description text constraint test_cases_description_length
    check (char_length(trim(description)) between 1 and 2000),
  preconditions text constraint test_cases_preconditions_length
    check (char_length(trim(preconditions)) between 1 and 2000),
  expected_result text constraint test_cases_expected_result_length
    check (char_length(trim(expected_result)) between 1 and 2000),
  steps jsonb not null default '[]'::jsonb
    constraint test_cases_steps_shape check (public.test_case_steps_are_valid(steps)),
  priority text not null default 'Medium'
    constraint test_cases_priority check (priority in ('Low', 'Medium', 'High', 'Critical')),
  status text not null default 'Draft'
    constraint test_cases_status check (status in ('Draft', 'Ready', 'Deprecated')),
  -- Provenance, never permission, the same discipline every other created_by column in this schema
  -- follows: any Member may edit or delete a Case regardless of who created it.
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  -- Starts equal to created_by at insert (see assign_test_case_code) and changes on every subsequent
  -- edit — the first table in this schema where "who last touched it" is asked of anyone but the
  -- creator.
  updated_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Set once, by the soft-delete path in application code (an UPDATE, never a DELETE — see below).
  -- Frozen thereafter by freeze_test_case_provenance: this phase has no restore.
  deleted_at timestamptz
);

comment on table public.test_cases is
  'A single thing to verify, belonging to the Build it was written for — not its Release or Project. '
  'Deleting is an UPDATE setting deleted_at; there is no Postgres DELETE.';

-- A code is never reused, even after its Case is soft-deleted: this index has no `where deleted_at is
-- null` predicate, unlike the read policy and the data layer's own queries.
create unique index test_cases_one_code_per_build on public.test_cases (build_id, code);

-- Assigns TC-nnn atomically, so two Members creating a Case in the same Build at the same moment still
-- get two different codes — exactly the scenario "shared editing, no approval" is designed around, and
-- the reason this is not "count existing Cases and add one" in application code.
--
-- pg_advisory_xact_lock serialises concurrent inserts for the same Build without a separate counter
-- table: the lock is scoped to this transaction and keyed by the Build's own id, salted against a
-- second hash so it cannot collide with an advisory lock some later feature takes for an unrelated
-- reason. A collision between two different Builds' hashes would only serialise two unrelated inserts
-- against each other for no reason — harmless, and vanishingly unlikely.
create function public.assign_test_case_code()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext('test_cases_code'), hashtext(new.build_id::text));

  select coalesce(max((regexp_replace(code, '^TC-', ''))::integer), 0) + 1
  into next_number
  from public.test_cases
  where build_id = new.build_id;

  new.code := 'TC-' || to_char(next_number, 'FM000');
  return new;
end;
$$;

comment on function public.assign_test_case_code() is
  'Assigns the next TC-nnn for a Case''s Build under an advisory lock, so concurrent creates cannot '
  'collide. Runs before insert; a caller-supplied code is always overwritten.';

revoke execute on function public.assign_test_case_code() from public, anon, authenticated;

create trigger test_cases_assign_code
  before insert on public.test_cases
  for each row execute function public.assign_test_case_code();

-- updated_at is the database's business already, via touch_updated_at (reused from the projects
-- migration); updated_by needs the same treatment, extended to record who, not only when.
create function public.touch_test_case_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke execute on function public.touch_test_case_updated_by() from public, anon, authenticated;

-- Provenance is immutable, the same discipline projects.freeze_project_provenance established, plus
-- one fact this table has that projects does not: once a Case is soft-deleted there is no restore this
-- phase, so deleted_at is frozen the moment it is first written, exactly as the rest of provenance is
-- frozen from the moment of creation. Named to run before the touch triggers alphabetically, so an
-- illegal change is refused before updated_at/updated_by are stamped.
create function public.freeze_test_case_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.build_id is distinct from old.build_id
    or new.code is distinct from old.code
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at then
    raise exception 'A Case''s id, Build, code, creator and creation time cannot be changed';
  end if;

  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'A deleted Case cannot be restored or have its deletion time changed';
  end if;

  return new;
end;
$$;

revoke execute on function public.freeze_test_case_provenance() from public, anon, authenticated;

create trigger test_cases_freeze_provenance
  before update on public.test_cases
  for each row execute function public.freeze_test_case_provenance();

create trigger test_cases_touch_updated_at
  before update on public.test_cases
  for each row execute function public.touch_updated_at();

create trigger test_cases_touch_updated_by
  before update on public.test_cases
  for each row execute function public.touch_test_case_updated_by();

-- A Build carries no project_id of its own; is_project_member needs it two joins away, through the
-- Build's Release. security definer for the same reason release_project_id itself is: the answer must
-- not depend on whether the caller can already see the Build or Release row. Must only ever return the
-- one column it is named for, for the same reason every other predicate in this schema must.
create function public.build_project_id(p_build_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select public.release_project_id(release_id) from public.builds where id = p_build_id;
$$;

comment on function public.build_project_id(uuid) is
  'The Project a Build belongs to, reached through its Release. Used to reach is_project_member from a '
  'Case, which has no project_id column of its own.';

revoke execute on function public.build_project_id(uuid) from public, anon;
grant execute on function public.build_project_id(uuid) to authenticated;

alter table public.test_cases enable row level security;

-- Ordinary reads exclude soft-deleted Cases at the data layer, not here: row-level security decides
-- membership-visibility only, the same discipline lib/builds/dal.ts and lib/releases/dal.ts already
-- state for themselves.
create policy "Members can read their Project's Cases"
  on public.test_cases for select
  using (public.is_project_member(public.build_project_id(build_id)));

create policy "Members can create Cases in their Project's Builds"
  on public.test_cases for insert
  to authenticated
  with check (
    public.is_project_member(public.build_project_id(build_id))
    and created_by = (select auth.uid())
    and updated_by = (select auth.uid())
  );

-- Any Member may edit, not only the creator — see the file comment. This is also the policy that
-- permits "deleting": a soft delete is an UPDATE setting deleted_at, and freeze_test_case_provenance
-- above is what stops it being undone, not a narrower policy here.
create policy "Members can edit their Project's Cases"
  on public.test_cases for update
  using (public.is_project_member(public.build_project_id(build_id)))
  with check (public.is_project_member(public.build_project_id(build_id)));

-- Deliberately no delete policy. A Postgres DELETE is refused outright regardless of who issues it —
-- the same refuse-by-absence discipline releases and builds already use for the deletions Phase 2 did
-- not support at all.
