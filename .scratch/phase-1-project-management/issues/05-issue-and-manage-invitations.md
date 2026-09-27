# 05: Issue and manage Invitations

**What to build:** On the Members page, for the Owner only: a form taking an email address, the
resulting copyable link, the list of Invitations still outstanding, and the ability to cancel one.

Read ADR-0004 first. There is no mail delivery in this phase and the interface must not imply there
is: the Owner is handed a single-use link and sends it themselves. The words matter here — "Copy the
link and send it to them" is honest, "We've emailed them" is not.

The token is 32 random bytes, base64url, generated in the action. Only its SHA-256 hash is stored, so
the raw token exists in the link and nowhere else — which means the link can be shown once, when it is
created, and reconstructed never. The pending list therefore shows who was invited and when it
expires, not a link to copy again. (Resending is out of scope: cancel and invite again.)

The link is assembled in the browser. The server hands the client component a path and it prefixes
`window.location.origin` at copy time; `app/auth/confirm/route.ts` explains why the server does not
trust its own idea of its origin, and that reasoning holds here. No new environment variable.

Inviting an address that already has a live pending Invitation is refused with a message naming the
address. Inviting one whose pending Invitation has **expired** succeeds: the action cancels the stale
row first, because the partial unique index cannot distinguish them — an index predicate may not call
`now()`. Inviting someone who is already a Member is refused too, and says so.

Lifetime is seven days.

**Blocked by:** 04.

**Status:** ready-for-agent

- [x] An Owner can invite by email address from the Members page; a Member sees no invite form
- [x] The address is validated in the browser and again in the action, and stored lower-cased
- [x] Creating an Invitation stores a SHA-256 hash of the token and never the token
- [x] The link is shown once, on creation, with a copy control and wording that makes clear the Owner sends it themselves
- [x] The absolute URL is built in the browser from `window.location.origin`; no `NEXT_PUBLIC_SITE_URL` is introduced
- [x] Pending Invitations are listed for the Owner with the address, who invited them, and when the Invitation expires
- [x] An expired pending Invitation is shown as expired, without any stored status having changed
- [x] Inviting an address with a live pending Invitation is refused, with a message naming the address
- [x] Inviting an address whose Invitation has expired succeeds and supersedes the stale row
- [x] Inviting someone who is already a Member is refused and says so
- [x] Cancelling a pending Invitation makes its link stop working
- [x] A Member cannot create or cancel an Invitation, and cannot read the Invitation list — refused by the database as well as absent from the interface
- [x] Browser tests cover inviting, the duplicate refusal, cancelling and then failing to accept, and a Member finding none of these controls

## Comments

**The link is an anchor as well as a string.** The server hands the form a *path*, because its only idea
of its own address is a Host header the caller writes — the reasoning `app/auth/confirm/route.ts` already
records. The browser assembles the absolute URL, and the element is an `<a href="/invitations/…">`, so
"copy link address" produces the whole URL even if the client bundle never runs. With JavaScript the text
becomes the URL itself and a Copy button puts it on the clipboard; a refused clipboard is not reported,
because the link is on screen and selectable either way.

**Reading the origin uses `useSyncExternalStore`, not an effect.** An effect that called `setState` was
the first version and eslint's `react-hooks/set-state-in-effect` was right to refuse it: React renders the
server snapshot during hydration and swaps in the client's afterwards, which is the same result without
pretending a one-off read is a subscription.

**"One live Invitation per address" is the database's answer, not the action's.** The action asks, but the
partial unique index decides: two clicks can both pass a check made a moment earlier and only one can win
the insert, so `23505` is translated into the same message the check would have produced. The expired case
is the one the index cannot express — its predicate must be immutable and `now()` is not — so the action
cancels a stale row before inserting, which is what keeps expiry a delay rather than a dead end.

**"Already a member" is asked before "already invited".** Both can be true of the same address, and the
more useful answer is the one about the person rather than the paperwork.

**Cancelling has no confirmation step.** It is the least destructive of the phase's three destructive
actions — the address can be invited again immediately — and the `alert-dialog` the others use arrives
with ticket 07, which is where cancelling gains one too.

**The invite field's hint says accepting needs an account**, because it does, and ticket 06 makes
registering part of the flow. Better said on the form than discovered by a colleague.

**Ticket 03's finding held.** Neither action binds the Project id; both take it from a hidden field and
re-check ownership of whatever arrives, because a bound Server Action does not survive a submission with
no client bundle. The no-JavaScript test in this ticket is what proves the invite action validates on its
own, and it passes.

**A shared rule moved rather than being copied.** `isEmailShaped` now lives in `lib/email.ts`: inviting a
colleague asks the same question registration does, and two regular expressions for one rule is two
answers waiting to disagree. `lib/auth/validation.ts` imports it, and the messages either side stay their
own — registration says "your work email", inviting says "the person you want to invite".

**What the standards review changed.** One of these was a bug, not a style point:

- **A swallowed error was permission to invite.** The action asked `project_people` through the client
  directly and ignored the error, so a failed read produced an empty list — and an empty list here reads
  as "not a member". A database hiccup would have let an existing Member be invited again. It goes through
  `listProjectPeople` now, which is the only door to that function and the only version that throws.
- **`listPendingInvitations` was keeping this module's contract by accident.** Every read here establishes
  identity first; that one was covered only because it happened to call another read that did. It calls
  `verifySession()` itself now.
- **"Send Invitation" implied the thing ADR-0004 says the interface must not.** The button is "Create
  Invitation" with a person-plus icon rather than a paper plane, and "Nothing has been sent" is "Nothing
  has been created". The original brief drew `[ Send Invitation ]` — before the phase decided there would
  be no delivery — so the ADR wins and the departure is recorded here.
- **The reset was keyed on a sentence.** Emptying the box after a success remounted the field keyed on the
  wording of the notice, so rewording the copy would have silently broken it, and the parent's mirror kept
  the old address either way. The field is its own component now, keyed on the path of the link just
  issued: unique per invitation, and it resets the mirror with the DOM because they are remounted together.
- **A third copy of the mirroring logic became a shared one.** `useProjectDetails` was specific to a name
  and a description; it is now `useMirroredFields`, generic over a field set and taking the validator as an
  argument, used by all three forms. Its own doc had said the second verbatim copy was the point at which
  it wanted a name — the third is the point at which it wanted generalising.
- **The page stopped deciding what the database decides.** It skipped the Invitations query for a Member;
  row-level security returns nothing to them anyway, and the DAL's own warning is that a page which
  filters is a page that can forget to. The render is still gated: absent for a Member, not disabled.
- **`tabular-nums` on the expiry date**, as DESIGN.md §3 asks of every timestamp.

**What the spec review changed.** Two of its findings were already fixed by the standards pass (the
swallowed `project_people` error, and "Nothing has been sent"). Three were new:

- **A cancelled link was still being offered as the one to send.** Cancelling revalidates the page but
  cannot reach into the invite form's action state, so the Owner was left looking at "Invitation created
  for X" and a live-looking link — directly beneath a card explaining that cancelling stops a link working.
  The action now says who the link was for, and the panel lasts exactly as long as that Invitation is still
  among the ones waiting. A test asserts the panel goes.
- **The inviter fallback called a person a Member** — "a former member" — which `CONTEXT.md` forbids, and
  said it inline where every other user-facing string comes from the catalogue. It is
  `projectMessages.inviterNoLongerHere` now, and unreachable until ownership can move.
- **Expiry is judged by two clocks**, this server's for the label and the database's for the decision.
  Under skew they can disagree for as long as the skew lasts. Recorded in the code rather than closed: the
  database is the authority on when a link is spent, this is a label, and asking Postgres the time once per
  row is a worse trade than a label that can be a second stale.
- **One criterion was thinly covered**: no test issued an invitation to an address typed in capitals. One
  does now, and asserts the list shows it lower-cased — the spelling the unique index depends on.
- **The deferred cancel confirmation now lands somewhere.** Ticket 07 has a checkbox for it, rather than
  this ticket's Comments being the only record that it was put off.

**And one test that was asserting nothing.** The new uppercase test ended with
`expect(page.getByText("Peter@Example.COM")).toHaveCount(0)`, which failed against a page that had done
exactly the right thing: `getByText` with a *string* matches case-insensitively, so it found the
lower-cased text twice. The obvious spelling of that assertion would have passed whatever the case — the
one thing it exists to check. It is a regex now, which Playwright matches case-sensitively.
