-- Testing Attempts and Results: the first data in this schema that describes what actually happened,
-- rather than what is meant to happen (a Case) or what merely exists (a Build).
--
-- CONTEXT.md and ADR-0006: an Attempt belongs to the Build it runs against, and a Result copies its
-- Case's title, description, preconditions, steps and expected result the moment the Attempt starts,
-- rather than reading them live — so a later edit to the Case can never reach back and change what an
-- already-recorded Result meant. Vocabulary: a Result's verdict is an Outcome, never a "status" — see
-- CONTEXT.md's "Status now names two different things" note.
--
-- As with every table below Project level so far, there is no Owner-only policy anywhere in this file:
-- any Member may start an Attempt, record Results against it, complete it, or delete it while it is
-- still In Progress — the same shared model Phases 2 and 3 established.

create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  build_id uuid not null references public.builds (id) on delete cascade,
  -- Assigned by assign_attempt_number below, never by the caller.
  attempt_number integer not null,
  status text not null default 'In Progress'
    constraint test_attempts_status check (status in ('In Progress', 'Completed')),
  -- Provenance, never permission: any Member may complete or delete an Attempt regardless of who
  -- started it. This is also what the interface shows as the Attempt's "tester" — see the spec's
  -- Implementation Decisions.
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  started_at timestamptz not null default now(),
  -- Null until the Attempt is completed, set exactly once.
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.test_attempts is
  'One pass through a Build''s Cases. Belongs to a Build, not a single Case or its starting User. '
  'Permanently un-updatable and undeletable once status is Completed — see the update and delete '
  'policies below, which are the entire enforcement of that rule.';

-- A number is never reused and never skipped by anything but a failed transaction: this index has no
-- soft-delete predicate to worry about, since deleting an Attempt (while In Progress) removes the row
-- outright rather than flagging it.
create unique index test_attempts_one_number_per_build on public.test_attempts (build_id, attempt_number);

-- Assigns attempt_number atomically, so two Members starting an Attempt on the same Build at the same
-- moment still get two different numbers — the same pg_advisory_xact_lock pattern
-- assign_test_case_code() already uses for TC-nnn, salted the same way against an unrelated feature's
-- own advisory lock.
create function public.assign_attempt_number()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext('test_attempts_number'), hashtext(new.build_id::text));

  select coalesce(max(attempt_number), 0) + 1
  into next_number
  from public.test_attempts
  where build_id = new.build_id;

  new.attempt_number := next_number;
  return new;
end;
$$;

comment on function public.assign_attempt_number() is
  'Assigns the next attempt_number for an Attempt''s Build under an advisory lock, so concurrent starts '
  'cannot collide. Runs before insert; a caller-supplied attempt_number is always overwritten.';

revoke execute on function public.assign_attempt_number() from public, anon, authenticated;

create trigger test_attempts_assign_number
  before insert on public.test_attempts
  for each row execute function public.assign_attempt_number();

-- Provenance is immutable, the same discipline freeze_test_case_provenance established: nothing about
-- who started an Attempt, which Build it belongs to, its number, or when it began should ever be
-- rewritable, even while it is still In Progress and therefore otherwise updatable. Named to run
-- before the touch trigger alphabetically, so an illegal change is refused before updated_at is
-- stamped.
create function public.freeze_test_attempt_provenance()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.build_id is distinct from old.build_id
    or new.attempt_number is distinct from old.attempt_number
    or new.created_by is distinct from old.created_by
    or new.started_at is distinct from old.started_at
    or new.created_at is distinct from old.created_at then
    raise exception 'An Attempt''s id, Build, number, starter and start time cannot be changed';
  end if;

  return new;
end;
$$;

revoke execute on function public.freeze_test_attempt_provenance() from public, anon, authenticated;

create trigger test_attempts_freeze_provenance
  before update on public.test_attempts
  for each row execute function public.freeze_test_attempt_provenance();

create trigger test_attempts_touch_updated_at
  before update on public.test_attempts
  for each row execute function public.touch_updated_at();

alter table public.test_attempts enable row level security;

create policy "Members can read their Project's Attempts"
  on public.test_attempts for select
  using (public.is_project_member(public.build_project_id(build_id)));

-- status is constrained to 'In Progress' here in addition to the column default, so a hand-crafted
-- insert cannot start an Attempt that is already Completed and so skip the recording flow entirely —
-- the same "the API refuses what the interface refuses" discipline test_cases' own updated_by check
-- follows.
create policy "Members can start Attempts on their Project's Builds"
  on public.test_attempts for insert
  to authenticated
  with check (
    public.is_project_member(public.build_project_id(build_id))
    and created_by = (select auth.uid())
    and status = 'In Progress'
  );

-- USING requires status = 'In Progress', which is the entire enforcement of "a Completed Attempt is
-- permanently un-updatable": once status becomes Completed, no further UPDATE — including one trying
-- to set it back to In Progress — can ever target this row again. No separate "no reopening" check is
-- needed beyond this.
create policy "Members can update their Project's in-progress Attempts"
  on public.test_attempts for update
  using (
    public.is_project_member(public.build_project_id(build_id))
    and status = 'In Progress'
  )
  with check (public.is_project_member(public.build_project_id(build_id)));

-- Only an in-progress Attempt can be deleted; a Completed one is a historical record and this is the
-- entire enforcement of that. Unlike test_cases, a Postgres DELETE is the real deletion path here —
-- there is no soft-delete for Attempts.
create policy "Members can delete their Project's in-progress Attempts"
  on public.test_attempts for delete
  using (
    public.is_project_member(public.build_project_id(build_id))
    and status = 'In Progress'
  );

create table public.test_results (
  id uuid primary key default gen_random_uuid(),
  testing_attempt_id uuid not null references public.test_attempts (id) on delete cascade,
  -- Safe to reference forever: Cases are only ever soft-deleted (test_cases.deleted_at), never removed
  -- as a row, so this FK cannot be broken by a later Case deletion. See ADR-0006.
  test_case_id uuid not null references public.test_cases (id) on delete restrict,
  -- Copied verbatim from the Case at Attempt-creation time, and frozen from that moment by
  -- protect_test_result_integrity below — this is the entire mechanism behind ADR-0006. Not
  -- re-validated against test_cases' own CHECK constraints on write: these are an internal copy of
  -- already-valid data, not user input arriving fresh.
  test_case_title_snapshot text not null,
  test_case_description_snapshot text,
  test_case_preconditions_snapshot text,
  test_case_steps_snapshot jsonb not null default '[]'::jsonb,
  expected_result_snapshot text,
  -- A verdict, not a lifecycle position — see CONTEXT.md's Status-vs-Outcome note. Named outcome,
  -- deliberately not status, to keep it distinct from test_attempts.status and test_cases.status.
  outcome text not null default 'Not Run'
    constraint test_results_outcome check (outcome in ('Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped')),
  notes text constraint test_results_notes_length check (char_length(trim(notes)) between 1 and 2000),
  -- Both null until the first Result is recorded, then whoever last saved it — any Member, not only
  -- whoever started the Attempt (the same shared-editing model test_cases already established).
  executed_by uuid references auth.users (id) on delete restrict,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.test_results is
  'What was found when one Case was worked within one Attempt. Holds its own frozen copy of the '
  'Case''s fields rather than reading them live — see ADR-0006.';

-- One Result per Case per Attempt: the bulk-insert that starts an Attempt writes each exactly once,
-- and nothing after that should ever be able to duplicate one.
create unique index test_results_one_per_case_per_attempt on public.test_results (testing_attempt_id, test_case_id);

-- test_results carries no build_id of its own — is_project_member needs it one join further than
-- test_cases does, through the Result's Attempt. security definer for the same reason
-- build_project_id/release_project_id are: the answer must not depend on whether the caller can
-- already see the test_attempts row. Must only ever return the one column it is named for.
create function public.attempt_project_id(p_testing_attempt_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select public.build_project_id(build_id) from public.test_attempts where id = p_testing_attempt_id;
$$;

comment on function public.attempt_project_id(uuid) is
  'The Project an Attempt belongs to, reached through its Build. Used to reach is_project_member from '
  'a Result, which has no project_id or build_id column of its own.';

revoke execute on function public.attempt_project_id(uuid) from public, anon;
grant execute on function public.attempt_project_id(uuid) to authenticated;

-- Two invariants this table depends on, checked together since both are "can this Result be changed
-- at all": (1) a Result's identity and Case snapshot never change once written, full stop, regardless
-- of the Attempt's own status — this is ADR-0006 itself, not merely a consequence of it; (2) once the
-- parent Attempt is Completed, nothing about the Result may change at all, not even notes. security
-- definer so the second check does not depend on the caller's own visibility of test_attempts, the
-- same reasoning attempt_project_id above follows.
create function public.protect_test_result_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_status text;
begin
  if new.id is distinct from old.id
    or new.testing_attempt_id is distinct from old.testing_attempt_id
    or new.test_case_id is distinct from old.test_case_id
    or new.test_case_title_snapshot is distinct from old.test_case_title_snapshot
    or new.test_case_description_snapshot is distinct from old.test_case_description_snapshot
    or new.test_case_preconditions_snapshot is distinct from old.test_case_preconditions_snapshot
    or new.test_case_steps_snapshot is distinct from old.test_case_steps_snapshot
    or new.expected_result_snapshot is distinct from old.expected_result_snapshot
    or new.created_at is distinct from old.created_at then
    raise exception 'A Result''s identity and Case snapshot cannot be changed once recorded';
  end if;

  select status into attempt_status from public.test_attempts where id = old.testing_attempt_id;
  if attempt_status = 'Completed' then
    raise exception 'A Result cannot be changed once its Attempt is Completed';
  end if;

  return new;
end;
$$;

revoke execute on function public.protect_test_result_integrity() from public, anon, authenticated;

create trigger test_results_protect_integrity
  before update on public.test_results
  for each row execute function public.protect_test_result_integrity();

create trigger test_results_touch_updated_at
  before update on public.test_results
  for each row execute function public.touch_updated_at();

alter table public.test_results enable row level security;

create policy "Members can read their Project's Results"
  on public.test_results for select
  using (public.is_project_member(public.attempt_project_id(testing_attempt_id)));

-- outcome is constrained to 'Not Run' here in addition to the column default, so a hand-crafted insert
-- cannot fabricate an already-recorded Result outside the start-of-Attempt bulk insert — the same
-- discipline test_attempts' own insert policy applies to status above.
create policy "Members can create Results in their Project's Attempts"
  on public.test_results for insert
  to authenticated
  with check (
    public.is_project_member(public.attempt_project_id(testing_attempt_id))
    and outcome = 'Not Run'
  );

-- Membership alone: protect_test_result_integrity above is what actually decides whether a given
-- update is allowed to go through, not this policy.
create policy "Members can update their Project's Results"
  on public.test_results for update
  using (public.is_project_member(public.attempt_project_id(testing_attempt_id)))
  with check (public.is_project_member(public.attempt_project_id(testing_attempt_id)));

-- Deliberately no delete policy. A Result is only ever removed by deleting its parent Attempt (the
-- cascade above); there is no standalone "remove this one Result" action.
