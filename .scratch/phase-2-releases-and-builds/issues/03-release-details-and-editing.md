# 03: Release details, and editing a Release

**What to build:** The full `/projects/[projectId]/releases/[releaseId]` page, replacing ticket 02's
placeholder: version, name and description shown in full, an inline edit form open to any Member —
not only the Project's Owner — and an honest empty state for Builds, since Build creation does not
exist until the next ticket.

There is no Owner/Member asymmetry here, unlike Project Settings: any Member may edit a Release, so
editing happens inline on the Details page rather than behind a separate Settings-style route that
would exist for no reason. Editing runs the same validation as creation — trimmed, length-checked
fields — and the same uniqueness check: renaming a Release's version into one already used elsewhere
in the Project is rejected, exactly as creating a second Release with that version already is.

The Build list on this page is real markup, not a stub — it is simply empty for every Release this
ticket touches, with a message explaining that Builds arrive by creating one, and a call to action that
does nothing until ticket 04 wires it up. Do not draw a fake "3 builds" or placeholder rows; an honest
empty state beats an invented one.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] `/projects/[projectId]/releases/[releaseId]` shows the Release's version, name (if set) and description
- [ ] Any Member can open an edit form for version, name and description — not only the Owner
- [ ] Editing enforces the same trim/length rules as creation
- [ ] Editing a version into one already used elsewhere in the same Project is rejected with a clear message
- [ ] Editing a version into one used in a different Project succeeds
- [ ] Saving an edit updates the Release, bumps `updated_at`, and shows the new values without a reload
- [ ] A Release with no Builds shows an honest empty state, not invented data
- [ ] A signed-in non-member opening this Release's URL gets a 404
- [ ] Browser tests cover viewing a Release's details, a successful edit, an edit rejected for an invalid version, and an edit rejected for a version collision
