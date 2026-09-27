# 07: Leave a Project, and remove a Member

**What to build:** A Member leaves from Settings; an Owner removes someone from the Members list. Both
confirm first, and both end access immediately.

Confirmation is a shadcn `alert-dialog` — a new component; only `alert, button, card, checkbox, input,
label` are installed — whose confirm button is a real form submitting to a Server Action. Note the
deliberate regression: the authentication phase made a point of sign-out working "whether or not the
client bundle has loaded", and opening a dialog does not. That trade is recorded in the spec; do not
quietly fix it by dropping the confirmation.

An Owner cannot leave. There is no transfer of ownership and no deletion in this phase, so the Owner
of a Project is in it permanently — the spec records this as an accepted dead end. Settings shows an
Owner no Leave control at all, and the database refuses the deletion of the last `owner` Membership
regardless of what any page offers.

Removal ends access at once, because access was never anything but the Membership: the Project
disappears from the removed User's list and its URL returns the same 404 a stranger gets. Nobody is
notified — there is no mail in this phase.

This ticket also closes the phase out: the message catalogue in `lib/projects/messages.ts` is complete
and every user-facing string comes from it, and the direct-API suite covers leaving and removal
alongside the policies it already exercises.

**Blocked by:** 06.

**Status:** ready-for-agent

- [ ] A Member can leave from Settings, after confirming in a dialog
- [ ] Leaving returns them to `/projects` and the Project is gone from the list
- [ ] After leaving, the Project's URL returns the same 404 a non-member gets
- [ ] An Owner sees no Leave control, and the database refuses removal of the last `owner` Membership even when asked directly
- [ ] An Owner can remove a Member from the Members list, after confirming in a dialog
- [ ] Cancelling an Invitation confirms in the same dialog — ticket 05 built the control and deferred its confirmation to this ticket, which is where the component arrives
- [ ] A removed Member loses access immediately: the Project leaves their list and its URL 404s
- [ ] A Member cannot remove anybody, refused by the database as well as absent from the interface
- [ ] A removed Member can be invited again and accept normally
- [ ] Every user-facing string in the phase comes from `lib/projects/messages.ts`, with a sensible fallback for anything unrecognised
- [ ] The direct-API suite covers a Member attempting to delete another's Membership, and an Owner attempting to delete their own
- [ ] Browser tests cover leaving, removal, the absence of both controls for the Role that may not use them, and re-invitation after removal
