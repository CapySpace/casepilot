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

- [ ] An Owner can invite by email address from the Members page; a Member sees no invite form
- [ ] The address is validated in the browser and again in the action, and stored lower-cased
- [ ] Creating an Invitation stores a SHA-256 hash of the token and never the token
- [ ] The link is shown once, on creation, with a copy control and wording that makes clear the Owner sends it themselves
- [ ] The absolute URL is built in the browser from `window.location.origin`; no `NEXT_PUBLIC_SITE_URL` is introduced
- [ ] Pending Invitations are listed for the Owner with the address, who invited them, and when the Invitation expires
- [ ] An expired pending Invitation is shown as expired, without any stored status having changed
- [ ] Inviting an address with a live pending Invitation is refused, with a message naming the address
- [ ] Inviting an address whose Invitation has expired succeeds and supersedes the stale row
- [ ] Inviting someone who is already a Member is refused and says so
- [ ] Cancelling a pending Invitation makes its link stop working
- [ ] A Member cannot create or cancel an Invitation, and cannot read the Invitation list — refused by the database as well as absent from the interface
- [ ] Browser tests cover inviting, the duplicate refusal, cancelling and then failing to accept, and a Member finding none of these controls
