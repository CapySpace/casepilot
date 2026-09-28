# 06: Accept an Invitation

**What to build:** `/invitations/[token]`, openable while signed out, showing which Project the person
has been invited to and by whom, with an explicit Accept — and the two paths that get them there: sign
in, or register and verify first.

Making the route public needs care. `lib/auth/routes.ts` matches exactly and never by prefix, on
purpose: "a prefix would make `/sign-in-internal-admin` public". So the module gains a second, small
list of **anchored** patterns — `^/invitations/[A-Za-z0-9_-]{43}$` — checked alongside the exact set,
with unit tests enumerating what it must refuse. That list is a security control; treat it like the
`safeNext` guard from ticket 05 of the authentication phase.

Signed out, the page offers sign-in and registration, each carrying `?next=/invitations/<token>`, and
registration prefills the invited address. `safeNext()` already permits any same-origin path with its
query string, so the destination survives the verification email untouched — no new redirect
machinery, and nothing to add to the provider's allow-list beyond what is there.

Acceptance is never automatic. A prefetch or a mail client's link scanner would otherwise spend the
token, and joining a Project is consent. The person presses Accept, `accept_invitation` runs, and they
land in the Project.

Binding is strict. If the signed-in User's address does not match the Invitation's, the page says
which address it was sent to and which they are signed in as, and offers a way to sign out — see
ADR-0004 for why an unaddressed join link was rejected. Expired, cancelled, already-accepted and
already-a-member each get their own explanation from `lib/projects/messages.ts`; none of them is an
error page.

**Blocked by:** 05.

**Status:** ready-for-agent

- [x] `/invitations/[token]` is public through an anchored pattern, with unit tests enumerating the paths the allow-list must still refuse
- [x] Signed out, the page names the Project and the inviter and offers sign-in and registration, each carrying the invitation as its onward destination
- [x] Registration from an invitation prefills the invited address
- [x] After registering and verifying, the User arrives back on the invitation page and the Invitation is still pending
- [x] Signing in from an invitation returns the User to the invitation page
- [x] Accepting is an explicit action; merely opening the page never spends the token
- [x] Accepting creates the Membership, marks the Invitation accepted, and lands the User in the Project, which then appears on their Projects list
- [x] A second attempt with the same link explains that it has been used, and creates no second Membership
- [x] An expired Invitation is refused with an explanation that it was time-limited and another must be requested
- [x] A cancelled Invitation is refused with its own explanation
- [x] Someone already in the Project is told so plainly
- [x] A signed-in User whose address does not match is told which address the Invitation was sent to, and offered a way to sign out — and cannot accept
- [x] Browser tests cover the whole register-then-accept path end to end, accept-while-signed-in, reuse, expiry, cancellation, and the wrong-address refusal

## Comments

**The spec was wrong about one thing, and this ticket is where it showed.** It said the destination
"survives the verification round trip with no new machinery", because `safeNext()` already accepts any
same-origin path. It does — but nothing was putting the invitation *into* the link: the confirmation
template hardcoded `next=/`, and the only way to vary a provider-built link is `emailRedirectTo`, which is
an **absolute** URL. Building one means deciding this site's origin, and the only thing the server has to
go on is a Host header the caller writes — which `app/auth/confirm/route.ts` refuses to trust, for reasons
it states itself.

So the destination never leaves the browser. `lib/auth/destination.ts` writes it as an httpOnly cookie when
registration begins and the confirmation route consumes it, preferring a destination the link carries of
its own (which is how a recovery link still lands on the reset form). Two consequences worth knowing:

- **The confirmation template no longer names a destination at all.** It said `next=/`, which beat the
  cookie every time; now the landing page is named once, in code, by `AUTHENTICATED_HOME`. The recovery
  template still names `/reset-password`, because that is a real destination rather than a default.
- **Registering in one browser and opening the email in another lands on Projects**, with the invitation
  link still in the inbox. The alternative was trusting a Host header to build a URL that travels through
  email, which is a worse trade for a rarer case.

**The page discloses only what holding the token already discloses**: one Project's name, who invited them,
and the address the email went to. It is public through a single anchored pattern in `lib/auth/routes.ts`
— 43 base64url characters, anchored at both ends — and the unit tests enumerate the spellings it must
refuse, including `/invitations/<token>/accept`, a 44-character token, and `/invitationsX/<token>`.

**Nothing on the page spends the token.** Reading is a read and joining is a button, because a mail
client's link scanner and a browser prefetch both follow links and neither presses buttons. A test opens
the page twice before accepting to prove it.

**A wrong-address link is a hand-over, not a wall.** It names the address the Invitation was sent to and
the one they are signed in as, and offers to sign out and come back to *this* invitation's sign-in — which
is why `signOut` now takes an optional destination, reduced by the same guard as every other redirect.

**Already a Member is a redirect, not a refusal.** `accept_invitation` returns `already_member` with the
Project id; somebody who is already in is taken there rather than told off. The Invitation stays pending
for the Owner to cancel, exactly as ticket 01 recorded.

**A shared test helper was hiding the thing under test.** `signIn()` navigated to `/sign-in` before
filling the form, which threw away the `?next=` the invitation had put there — so the first version of the
sign-in test passed through a form that had forgotten where it was going. It is `submitSignIn()` now, for
filling the form already on screen, with `signIn()` built on top.

**What the review changed.** One was a disclosure bug:

- **The remembered destination was bound to the browser, not to the person.** On a shared machine, somebody
  began registering from an invitation and whoever next confirmed *anything* in that browser was handed it —
  landing on an invitation page naming a Project, an inviter and somebody else's address, without ever
  holding the token. That is exactly the disclosure this page justifies by saying the token is what you must
  hold. The cookie now carries who it is for and is honoured for nobody else; it is left in place rather
  than consumed when it belongs to somebody else, so an intervening confirmation no longer silently drops a
  pending invitation. A browser test drives that sequence.
- **An abandoned destination outlived its reason.** Registering from an invitation, abandoning it and
  registering plainly within the hour delivered the second registration to the first invitation. Nothing to
  remember now clears what was remembered.
- **`wrong_address` was reported as "something went wrong".** Nothing had gone wrong: the link is fine and
  the reader is not the person it was addressed to. It says so, naming both addresses, and the
  `destructive` crimson alert is gone with it — DESIGN.md §2 is explicit that colouring a non-failure red
  would lie.
- **"Already a member" was a silent redirect, and its message was dead code.** The criterion says *told so
  plainly*; a page that quietly moves leaves somebody wondering whether they joined twice. They are told,
  and then given the way in.
- **Two vocabularies for one fact.** `invitation_preview` says `accepted` where `accept_invitation` says
  `used`, and the page and the action each mapped states to words separately. `lib/projects/invitation-state.ts`
  holds one vocabulary and one mapping, used by both.
- **The switch relied on a comment for its correctness** — `redirect` throwing was what stopped a
  fallthrough. The one path that leaves the page is an `if` before the switch now, and an outcome this
  application has never heard of no longer claims the link is invalid.
- **`lib/projects/dal.ts` claimed something untrue.** Its header said every read establishes a session
  first; `previewInvitation` cannot. The header names the exception and says it is the only one.
- **A sentinel that could not mean what it was asked to.** `parseConfirmationLink` defaulted `next` to the
  landing page, so the confirmation route could not tell "no destination" from "a link naming that same
  path" from "a destination `safeNext` refused". It returns null now, and the route's choice is one line.
- **`safeNext` moved to `lib/auth/routes.ts`.** Five callers sanitise a redirect target, and importing that
  from a module named for email confirmation pointed the reader at the wrong thing.
- **The primary button was on the wrong control.** DESIGN.md §4 keeps it for the committing action, one per
  view; on an invitation that is *Join*, not "Create an account". Both routes are secondary.
- **Ten copies of `h-11 w-full text-body-lg`** became a `size="field"` on Button — 44px, the height
  DESIGN.md §4 pairs with its inputs, which shadcn's `lg` (36px) is not.

**Left undone, deliberately:** the auth card's `rounded-2xl border border-border bg-card p-lg shadow-level-1
sm:p-xl` is now its third verbatim copy and wants to move into the `(auth)` layout. That touches six pages
that are not this ticket's, and not every one of them wants a card.
