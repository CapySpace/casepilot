-- Releases and Builds: the first layer of the testing hierarchy below a Project.
--
-- CONTEXT.md: a Release is a named version or milestone holding the Builds produced under it; a
-- Build is a specific, testable build produced under a Release, identified by an externally-assigned
-- build number CasePilot records rather than mints. Every policy here reuses is_project_member from
-- the projects migration outright — ADR-0003 named Releases and Builds by name as inheriting it
-- rather than growing a new predicate, and this is that prediction landing.
--
-- Unlike projects, there is no Owner-only policy anywhere in this file. Any Member may create and
-- edit a Release, and create a Build; the operational record-keeping this phase is for should not
-- bottleneck on the one person who happens to hold the owner Membership.

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version text not null constraint releases_version_not_blank
    check (char_length(trim(version)) between 1 and 100),
  -- Optional, and deliberately not surfaced prominently in the interface yet — the Stitch reference
  -- this phase implements keys its Release cards off version alone. Stored because the spec asks for
  -- it; a later phase can decide it deserves more than an edit-form field.
  --
  -- No `is null or` guard on either check: a NULL fails neither `between` nor `<=`, since Postgres
  -- treats a NULL comparison as unknown rather than false, and an unknown result does not fail a
  -- CHECK constraint. The `projects` migration already relies on the same reading for `description`.
  name text constraint releases_name_length check (char_length(trim(name)) between 1 and 100),
  description text constraint releases_description_length check (char_length(description) <= 500),
  -- Provenance, never permission, the same discipline projects.created_by uses: any Member may edit
  -- a Release regardless of who created it, so consulting this column for a decision would invent a
  -- second authority nothing in this phase asks for.
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.releases is
  'A named version or milestone of a Project''s software, holding the Builds produced under it.';

-- A version is unique within its Project, case-sensitively: a version string is authored by the team,
-- not an identity key, so there is no collision here worth normalising case to prevent.
create unique index releases_one_version_per_project on public.releases (project_id, version);

-- Every policy in this file resolves membership through project_members' own index, exactly as the
-- projects migration's policies do. Nothing new is added here; is_project_member already reads it.

alter table public.releases enable row level security;

create policy "Members can read their Project's Releases"
  on public.releases for select
  using (public.is_project_member(project_id));

create policy "Members can create Releases in their Projects"
  on public.releases for insert
  to authenticated
  with check (public.is_project_member(project_id) and created_by = (select auth.uid()));

-- Any Member may edit, not only the Owner — see the file comment. The with check repeats using and
-- adds nothing beyond it: there is no created_by comparison here, for the same reason projects'
-- update policy has none — provenance is not permission.
create policy "Members can edit their Project's Releases"
  on public.releases for update
  using (public.is_project_member(project_id))
  with check (public.is_project_member(project_id));

-- Deliberately no delete policy. Deleting a Release is out of scope for this phase; row-level
-- security's default-deny is what enforces that, not an application-level check a direct API call
-- could bypass.

create trigger releases_touch_updated_at
  before update on public.releases
  for each row execute function public.touch_updated_at();

create table public.builds (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases (id) on delete cascade,
  build_number text not null constraint builds_build_number_not_blank
    check (char_length(trim(build_number)) between 1 and 100),
  description text constraint builds_description_length check (char_length(description) <= 500),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  -- Present for schema consistency with releases, but inert this phase: builds are create-and-view
  -- only, and the trigger below never fires because no update path is built on top of it. The Core
  -- Functions this phase specifies never list editing a Build.
  updated_at timestamptz not null default now()
);

comment on table public.builds is
  'A specific, testable build produced under a Release, identified by an externally-assigned build '
  'number CasePilot records rather than mints. Create-and-view only in this phase.';

-- A build number is unique within its Release, not within its Project: two Releases may each record a
-- "Build 100", because that number belongs to whatever CI system assigned it, not to CasePilot.
create unique index builds_one_number_per_release on public.builds (release_id, build_number);

-- A Build carries no project_id of its own — is_project_member needs it one join away, through the
-- Build's Release. `security definer` for the same reason is_project_member itself is: the answer
-- must not depend on whether the caller can already see the Release row. Without it, this lookup
-- would run through releases' own select policy (also is_project_member), and the two Builds
-- policies below would be correct only as a side effect of that other table's policy rather than by
-- their own check — exactly the coupling ADR-0003 rejects reading project_members' own table for
-- is_project_member's sake. Must only ever return the one column it is named for, for the same reason
-- is_project_member and is_project_owner must only ever return a boolean.
create function public.release_project_id(p_release_id uuid)
returns uuid
language sql
security definer
stable
set search_path = ''
as $$
  select project_id from public.releases where id = p_release_id;
$$;

comment on function public.release_project_id(uuid) is
  'The Project a Release belongs to, looked up independently of the caller''s own visibility. Used to '
  'reach is_project_member from a Build, which has no project_id column of its own.';

revoke execute on function public.release_project_id(uuid) from public, anon;
grant execute on function public.release_project_id(uuid) to authenticated;

alter table public.builds enable row level security;

create policy "Members can read their Project's Builds"
  on public.builds for select
  using (public.is_project_member(public.release_project_id(release_id)));

create policy "Members can create Builds in their Project's Releases"
  on public.builds for insert
  to authenticated
  with check (
    public.is_project_member(public.release_project_id(release_id))
    and created_by = (select auth.uid())
  );

-- No update policy. Builds are create-and-view only this phase — see the table comment — so there is
-- nothing to grant, and default-deny is the whole of the enforcement.
--
-- No delete policy, for the same reason releases has none: out of scope, enforced by absence rather
-- than by a check a direct API call could bypass.

create trigger builds_touch_updated_at
  before update on public.builds
  for each row execute function public.touch_updated_at();
