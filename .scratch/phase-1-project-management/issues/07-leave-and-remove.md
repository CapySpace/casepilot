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

- [x] A Member can leave from Settings, after confirming in a dialog
- [x] Leaving returns them to `/projects` and the Project is gone from the list
- [x] After leaving, the Project's URL returns the same 404 a non-member gets
- [x] An Owner sees no Leave control, and the database refuses removal of the last `owner` Membership even when asked directly
- [x] An Owner can remove a Member from the Members list, after confirming in a dialog
- [x] Cancelling an Invitation confirms in the same dialog — ticket 05 built the control and deferred its confirmation to this ticket, which is where the component arrives
- [x] A removed Member loses access immediately: the Project leaves their list and its URL 404s
- [x] A Member cannot remove anybody, refused by the database as well as absent from the interface
- [x] A removed Member can be invited again and accept normally
- [x] Every user-facing string in the phase comes from `lib/projects/messages.ts`, with a sensible fallback for anything unrecognised
- [x] The direct-API suite covers a Member attempting to delete another's Membership, and an Owner attempting to delete their own
- [x] Browser tests cover leaving, removal, the absence of both controls for the Role that may not use them, and re-invitation after removal

## Comments

**The "Owner cannot leave" invariant is a trigger, not a policy.** Two delete policies do the ordinary work
— a Member may delete their own Membership while it is not the owner row, an Owner may delete anybody's but
their own — and neither can be the whole answer, because the service role bypasses row-level security. So
`refuse_to_orphan_project` refuses the deletion of an owner Membership whoever asks, and the RLS suite proves
it through the administrative client.

That trigger had to tell one case apart: **deleting a Project cascades to its Memberships**, and refusing
that would make Projects undeletable before anything can delete one. Postgres removes the parent row before
the referential action fires, so the trigger checks whether the Project still exists — if it does not, there
is no ownership left to protect. Ticket 01's cascade test is what holds that distinction in place.

**`shadcn add alert-dialog` could not be used.** It insists on overwriting `button.tsx`, which carries this
repo's theme and the `field` size added in ticket 06. The component is hand-written on the `radix-ui`
primitive the repo already depends on, so focus trapping, Escape, the `alertdialog` role and the
title/description association are the primitive's rather than mine, with DESIGN.md's modal treatment
(`rounded-3xl`, Level 3) on top.

**The confirmation needs JavaScript, and that is the documented trade.** The phase spec recorded it before
any of this was built: opening a dialog cannot degrade, so a destructive action's *question* does not appear
without the client bundle. The mutation behind it is still a plain form post. The alternative — a
confirmation page per action — is three more routes and a navigation each, and DESIGN.md specifies modals
for exactly this.

**Cancel is first in the markup**, so a keyboard reaches the safe answer before the destructive one.

**A success message with nowhere to live was removed rather than displayed.** Removal returned "X no longer
has access", into a component that unmounts with the row it just removed — so nobody could ever read it, and
an unreadable string is the dead-copy failure ticket 05's review caught. The row disappearing, and the count
above the table with it, is what a successful removal looks like. `couldNotRemove` stays, because a *failure*
leaves the row in place to show it.

**How the "every string from the catalogue" criterion was read.** Both message modules state their own scope:
what tells a User the outcome or state of something they attempted belongs in the catalogue; the words that
name a screen or a control do not. Every message of the first kind in this phase comes from
`lib/projects/messages.ts`, and every action has an explicit message for a failure it does not recognise.
Headings, field labels, button text and empty-state prose remain in the interface — including the dialog's
"Keep things as they are", which is a control. A reviewer who wants that line drawn elsewhere can move it;
what matters is that it is drawn on purpose.

**Two earlier tests changed with this ticket, both legitimately.** The Members list gained a trailing actions
column, so "the last cell" was no longer the Joined cell — that assertion now finds the cell by what it
contains. And cancelling an Invitation now asks first, so ticket 05's cancellation test presses through the
dialog.

**What the spec review changed.** The worst of it reported the opposite of what the database did:

- **A refused delete looked like a success.** PostgREST returns no error for a delete that row-level security
  reduces to nothing, so an Owner posting straight at the leave action was redirected to their Projects as
  though they had left one they are still in. Both actions now `.select()` the deleted rows and treat none as
  a refusal — and an Owner who posts anyway gets `ownerCannotLeave`, which is the reason rather than a shrug.
- **Removal revalidated one of the three pages that count people.** The Owner's own Projects list and the
  Project overview kept the old number. A test now walks all three after a removal.
- **A failure took the control away with it.** `RemoveMember` replaced itself with the error message, so the
  only way to try again was to reload — contradicting this ticket's own comment about why the message exists.
- **The invariant check depended on what the caller could see.** `refuse_to_orphan_project` runs as the
  invoking role by default, so its "does this Project still exist" test was subject to that role's policies:
  a caller for whom the Project is invisible would be told there is nothing to protect. It is
  `security definer` now. Unreachable today, and a hole the moment ownership can move.
- **`sr-only` on a `th` lifts the cell out of the row**, because it is absolutely positioned, while the body
  rows keep theirs. The label hides; the cell stays.

**Not covered by a test, and said rather than hidden:** the two "refused delete reports a failure" paths are
only reachable by posting directly at a Server Action, which no browser test can drive and which the RLS
suite covers from the other side — it proves the database refuses. The action's *reporting* of that refusal
is reasoned, not observed.

**What the standards review changed.** The most valuable finding was one nothing would have caught:

- **The confirmed submission worked by accident.** The confirming button is Radix's close button, so the
  dialog's content — including the form inside it — unmounted during the click handler, and the browser
  performs a submission *after* that. It survived only because the exit animation keeps content mounted until
  `animationend`. Deleting that class, or adding the `prefers-reduced-motion` reset this stylesheet does not
  yet have, would have broken leaving, removal and cancellation silently, with no error to find. The button
  now dispatches the Server Action itself in the click handler, which does not care what unmounts next, and
  `ConfirmAction` takes the action's arguments as `fields` rather than hidden inputs.
- **That also retires a claim that was never quite true.** These three actions were described as degrading to
  a form post. A form inside a dialog that cannot open without JavaScript was never reachable without
  JavaScript, so the honest statement — now in the component — is that they need the bundle, and that nothing
  else in the product does.
- **A policy contradicted its own comment.** The comment said "not the owner row"; the code said
  `role = 'member'`, which would have quietly stopped a Role added later from being able to leave. It is
  `role <> 'owner'`.
- **A modal's width was a bracket value.** `w-[calc(100%-2rem)]` is exactly what the design rules forbid, and
  `max-w-auth-card` was the wrong token borrowed. There is a `--container-modal` now, with the dialog's
  treatment — width, gutter, scrim, and which answer takes the primary button — recorded in DESIGN.md §4.
- **My "Cancel comes first" comment named the wrong cause.** Radix moves focus to the cancel control when the
  dialog opens whatever the markup order is. The property is real; the explanation was not.
- **Two smaller things:** `leave-actions.ts` beside an existing `settings/actions.ts` was a second module for
  one route's actions, which `members/actions.ts` had already settled — merged. And `const owner = …` named a
  boolean the way the glossary names a person; it is `viewerIsOwner`.

**Confirmed sound by the review**, which is worth recording because both were deliberate: the cascade
reasoning (the referential action is an AFTER-ROW trigger, so the parent really is gone by the time the check
runs), and the two delete policies having neither overlap nor gap.
