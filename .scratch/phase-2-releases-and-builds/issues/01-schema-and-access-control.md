# 01: Schema, access control and the direct-API suite for Releases and Builds

**What to build:** One migration that creates `releases` and `builds`, with every constraint,
uniqueness index and trigger the spec calls for, and row-level security expressed entirely through
the existing `is_project_member` predicate from ADR-0003 — plus the test suite that proves a
non-member is refused by the database itself, exactly as ticket 01 of Phase 1 did for `projects`.

`releases` holds `id`, `project_id` (references `projects`, cascades on Project deletion), `version`
(trimmed, 1–100 characters, non-empty), `name` (nullable, trimmed 1–100 characters when present),
`description` (nullable, ≤ 500 characters), `created_by` (references `auth.users`, `on delete
restrict`, provenance only), `created_at`, `updated_at`. `builds` holds `id`, `release_id` (references
`releases`, cascades on Release deletion), `build_number` (trimmed, 1–100 characters, non-empty),
`description` (nullable, ≤ 500 characters), `created_by`, `created_at`, `updated_at`. Uniqueness is
case-sensitive: `(project_id, version)` on `releases`, `(release_id, build_number)` on `builds` — a
version or build number is authored by the team, not an identity key, so there is no reason to
normalise case the way `project_invitations.email` does.

Every policy on both tables — select, insert, update — calls `is_project_member`. There is no
`is_project_owner`-gated policy anywhere in this phase: any Member may do all three. There is
deliberately **no delete policy on either table**. Do not write one; its absence is what row-level
security's default-deny turns into the out-of-scope decision, rather than an application-level check
that direct API access could bypass. `updated_at` is trigger-maintained on both tables, the same
pattern `projects` already uses; `builds.updated_at` exists for schema consistency even though nothing
in this phase writes to a Build after creation.

The RLS suite ships here, not with the pages that use it, for the same reason Phase 1's did: a policy
written today and tested three tickets later is a policy nobody re-reads. As two real signed-in Users
over the publishable key, it proves a User in Project A cannot select, insert into, or update Project
B's `releases` or `builds` — including reaching a Build through its Release's `id` directly, not only
through the Project, since nothing about the schema stops someone from trying that path.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `releases` exists with `id`, `project_id`, `version`, `name`, `description`, `created_by`, `created_at`, `updated_at`, and the constraints above
- [ ] `builds` exists with `id`, `release_id`, `build_number`, `description`, `created_by`, `created_at`, `updated_at`, and the constraints above
- [ ] `project_id` on `releases` cascades on Project deletion; `release_id` on `builds` cascades on Release deletion; `created_by` on both is `not null references auth.users(id) on delete restrict`
- [ ] A case-sensitive unique index enforces `(project_id, version)` on `releases`
- [ ] A case-sensitive unique index enforces `(release_id, build_number)` on `builds`
- [ ] Row-level security is enabled on both tables, and every policy is expressed through `is_project_member`
- [ ] No delete policy exists on either table
- [ ] A trigger maintains `updated_at` on both tables
- [ ] A direct-API suite, as two real Users over the publishable key, proves a non-member of a Project cannot select, insert, or update that Project's Releases or its Builds
- [ ] The same suite proves a non-member cannot reach a Build by its own id when they are not a member of the Project the Build's Release belongs to
- [ ] A member of the Project can select and insert into both tables, can update Releases, and cannot delete from either — and cannot update Builds either, since Builds are create-and-view only this phase
- [ ] Migration comments state the alternatives that lost, in the style of the `projects` migration
