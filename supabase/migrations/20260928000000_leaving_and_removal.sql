-- Leaving a Project, and being removed from one.
--
-- Ticket 01 deliberately wrote no delete policy for `project_members`: row-level security denies what it
-- does not grant, so until leaving existed the safe answer was that nobody could remove anybody. These are
-- the two grants that answer it, plus the one invariant no policy can express.

-- A Member leaves. Their own row, and only while it is not the owner row: an Owner leaving would abandon
-- the Project, and this phase has no way to hand it on. The interface offers them no Leave control, and
-- this is the same answer underneath.
create policy "Members can leave a Project"
  on public.project_members for delete
  using (user_id = (select auth.uid()) and role = 'member');

-- An Owner removes somebody. Not themselves — `and user_id <> auth.uid()` is what stops "remove" becoming
-- a way to do what "leave" refuses.
create policy "Owners can remove a Member"
  on public.project_members for delete
  using (public.is_project_owner(project_id) and user_id <> (select auth.uid()));

-- The invariant both policies are shaped around, stated once where nothing can get past it.
--
-- "Every Project has exactly one Owner" is a fact CONTEXT.md asserts; `project_members_one_owner` keeps a
-- second from appearing, and this keeps the last one from leaving. Policies alone would not: the service
-- role bypasses them, and a migration or a console is exactly where somebody would remove a row without
-- meaning to orphan a team's Cases.
--
-- The cascade from deleting a Project is *not* this: Postgres removes the parent row before the referential
-- action fires, so by the time this runs the Project is already gone and there is no ownership left to
-- protect. That is what the existence check distinguishes, and `tests/rls/invitations.test.ts` covers it.
-- `security definer` because the check must not depend on what the caller can see. A trigger runs as the
-- invoking role by default, so the existence test would be subject to that role's policies — and a caller
-- for whom the Project is invisible would be told there is no Project to protect, which is the opposite of
-- the truth. Unreachable today, and a hole the moment ownership can move.
create function public.refuse_to_orphan_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner'
    and exists (select 1 from public.projects where id = old.project_id) then
    raise exception 'A Project cannot lose its last owner: transfer ownership or delete the Project';
  end if;

  return old;
end;
$$;

comment on function public.refuse_to_orphan_project() is
  'Refuses deletion of an owner Membership while its Project still exists. Ownership transfer and Project '
  'deletion are the two features that will need to work with this, not around it.';

revoke execute on function public.refuse_to_orphan_project() from public, anon, authenticated;

create trigger project_members_keep_an_owner
  before delete on public.project_members
  for each row execute function public.refuse_to_orphan_project();
