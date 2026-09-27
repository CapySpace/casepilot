# 04: The Members list

**What to build:** `/projects/[projectId]/members`, showing everyone in the Project with their display
name, email address, Role and the date they joined — read through `project_people` from ticket 01.

This page is why `project_people` exists. `profiles` is readable only by its own User and holds no
email at all; the address lives in `auth.users`, which no client may read. The function joins the two
behind a membership check, so a name and an address are visible to the people who share a Project with
you and to nobody else. Do not reach around it, and do not add an email column to `profiles` — the
reasoning is in the spec and in ADR-0003.

Every Member sees the list; this is not an Owner-only page. The invite form and the pending
Invitations belong to ticket 05 and appear here for the Owner alone.

Roles carry no status colour, for the same reason as the Projects list: colour means status, and a
Role is not one.

**Blocked by:** 03.

**Status:** ready-for-agent

- [ ] Every Member of a Project can open the Members page and see everyone in it
- [ ] Each row shows display name, email address, Role and joined date
- [ ] The data comes from `project_people`; nothing queries `profiles` or `auth.users` directly
- [ ] A non-member gets the same 404 as elsewhere in the workspace
- [ ] Calling `project_people` for a Project you do not belong to returns nothing, proven in the direct-API suite
- [ ] Roles render without status colour, consistent with the Projects list
- [ ] The Owner is distinguishable from Members at a glance
- [ ] Browser tests cover a Member seeing both people after an invitation has been accepted, and the joined dates being present and plausible
