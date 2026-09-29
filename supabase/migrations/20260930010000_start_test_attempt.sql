-- Starting an Attempt is one transaction: the test_attempts row and every eligible Case's snapshot
-- test_results row, or neither. A Postgres function call is one transaction by construction, so this
-- is the whole of what atomicity requires here — no explicit BEGIN/COMMIT, no compensating cleanup.
--
-- Deliberately not `security definer`. The caller must already be a Member (the Server Action calling
-- this checks that first), and both target tables already have INSERT policies that permit any Member
-- to write directly — so running as the caller and letting ordinary row-level security apply to each
-- statement inside is simpler and safer than bypassing it and re-deriving the same authorization by
-- hand, the way accept_invitation must for a caller who is not yet a Member of anything.
create function public.start_test_attempt(p_build_id uuid)
returns public.test_attempts
language plpgsql
set search_path = ''
as $$
declare
  new_attempt public.test_attempts;
  eligible_count integer;
begin
  select count(*) into eligible_count
  from public.test_cases
  where build_id = p_build_id and deleted_at is null;

  -- Also the answer a non-member's call gets: row-level security returns no Cases for a Build they
  -- cannot see, so eligible_count is 0 and this is what refuses them — no separate membership check
  -- needed up front, and no distinct error that would tell them anything about a Build they cannot see.
  if eligible_count = 0 then
    raise exception 'A Build with no eligible Cases cannot start an Attempt';
  end if;

  insert into public.test_attempts (build_id)
  values (p_build_id)
  returning * into new_attempt;

  -- Two statements, not one: under the default READ COMMITTED isolation, a Case soft-deleted by
  -- another transaction in the instant between the count above and this insert would leave the new
  -- Attempt with one fewer Result than eligible_count implied. Still one atomic transaction — either
  -- both inserts land or neither does — just not a guarantee that this select sees the exact same
  -- rows the count did. Accepted rather than upgraded to SERIALIZABLE: the result is a Result set
  -- short by the one Case that vanished mid-start, not a duplicate or a corrupt row, and two Members
  -- racing a delete against a start on the very same Build in the very same instant is not a scenario
  -- worth the throughput cost of a stricter isolation level for every start.
  insert into public.test_results (
    testing_attempt_id,
    test_case_id,
    test_case_title_snapshot,
    test_case_description_snapshot,
    test_case_preconditions_snapshot,
    test_case_steps_snapshot,
    expected_result_snapshot
  )
  select
    new_attempt.id,
    id,
    title,
    description,
    preconditions,
    steps,
    expected_result
  from public.test_cases
  where build_id = p_build_id and deleted_at is null;

  return new_attempt;
end;
$$;

comment on function public.start_test_attempt(uuid) is
  'Starts an Attempt and snapshots every one of the Build''s eligible Cases into it, atomically. '
  'Raises if the Build has no eligible Cases (including, indistinguishably, if the caller cannot see '
  'any because they are not a Member).';

revoke execute on function public.start_test_attempt(uuid) from public, anon;
grant execute on function public.start_test_attempt(uuid) to authenticated;
