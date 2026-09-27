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

- [ ] `/invitations/[token]` is public through an anchored pattern, with unit tests enumerating the paths the allow-list must still refuse
- [ ] Signed out, the page names the Project and the inviter and offers sign-in and registration, each carrying the invitation as its onward destination
- [ ] Registration from an invitation prefills the invited address
- [ ] After registering and verifying, the User arrives back on the invitation page and the Invitation is still pending
- [ ] Signing in from an invitation returns the User to the invitation page
- [ ] Accepting is an explicit action; merely opening the page never spends the token
- [ ] Accepting creates the Membership, marks the Invitation accepted, and lands the User in the Project, which then appears on their Projects list
- [ ] A second attempt with the same link explains that it has been used, and creates no second Membership
- [ ] An expired Invitation is refused with an explanation that it was time-limited and another must be requested
- [ ] A cancelled Invitation is refused with its own explanation
- [ ] Someone already in the Project is told so plainly
- [ ] A signed-in User whose address does not match is told which address the Invitation was sent to, and offered a way to sign out — and cannot accept
- [ ] Browser tests cover the whole register-then-accept path end to end, accept-while-signed-in, reuse, expiry, cancellation, and the wrong-address refusal
