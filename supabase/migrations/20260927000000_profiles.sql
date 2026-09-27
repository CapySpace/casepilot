-- A profile record, one-to-one with a Supabase User.
--
-- The full name lives here rather than in provider metadata because later phases join display names
-- into Case and attempt queries, and provider metadata is not joinable in SQL. The terms acceptance
-- is recorded so that both sides can later establish what was agreed, and when.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  terms_accepted_at timestamptz not null default now(),
  -- Bumping this is a migration, deliberately: rows keep the version their User actually agreed to,
  -- and the value in force is a fact about the deployment rather than about any request. Keep it in
  -- step with TERMS_VERSION in lib/auth/terms.ts — a unit test fails if the two drift apart.
  terms_version text not null default '2026-09-27',
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'One per User. Created automatically by the trigger below; never inserted by the application.';

alter table public.profiles enable row level security;

-- A User may read their own profile and nothing else. Writes go through the trigger, so there is
-- deliberately no insert, update or delete policy: nothing in the application should be editing
-- this yet, and row-level security denies whatever is not granted.
create policy "Users can read their own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

-- Creating the profile in a trigger rather than in the registration action is what makes "every new
-- User has a profile" an invariant of the database instead of a promise the application keeps. The
-- alternative — a second write from the action — can fail after the User exists, leaving a User with
-- no name attached and no obvious way to notice.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the name is taken from metadata, because only the name is the User's to state.
  --
  -- When and to what they agreed are *our* record of *our* dealings with them, so they are stamped
  -- here from the column defaults: the server clock, and the version this deployment is serving.
  -- Reading them from metadata would have meant accepting whatever the caller sent — and the anon
  -- key is public, so anyone can call signUp() from a console with last century's date on it.
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Reads full_name from the metadata supplied at sign-up; stamps the terms record itself. '
  'full_name is NOT NULL on purpose: any path that creates a User must supply a name, and a path '
  'that cannot should fail loudly rather than leave a nameless profile behind.';

-- Supabase''s own guidance. Postgres refuses direct calls to a trigger function anyway, so this is
-- belt and braces rather than a hole being closed.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
