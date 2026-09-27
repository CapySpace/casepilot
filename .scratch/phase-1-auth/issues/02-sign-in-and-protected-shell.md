# 02: Sign in and the protected shell

**What to build:** A verified User enters their email and password and arrives at an authenticated
page that names them. A signed-out visitor who types that page's URL is sent to sign-in before any
of it renders.

This is the spine of the whole phase and the ticket that makes ADR-0002 concrete: a default-deny
proxy that redirects unauthenticated requests using only a local claims check, plus a Data Access
Layer that asks the provider directly and is the authoritative boundary. Neither is redundant —
without the proxy, protected pages flash before redirecting; without the Data Access Layer, any
route that forgets its own check is unguarded.

The authenticated page is an acknowledged placeholder. A Project is the tenant boundary that owns
Cases, and Projects arrive in Phase 2, so there is genuinely nothing else to show yet. Mark it as
temporary in the code.

**Blocked by:** 01 (Project foundations).

**Status:** ready-for-agent

- [x] A verified User can sign in with email and password and is taken straight to the authenticated area
- [x] The sign-in form matches the design: work email and password fields, a password visibility toggle, a link to password recovery, and a link to registration
- [x] There is no "remember this device" option; session lifetime is uniform for everyone
- [x] Wrong credentials produce one non-specific message that does not reveal whether the email address exists
- [x] An unverified User cannot sign in
- [x] Every route is protected unless explicitly declared public; the authentication routes and static assets are the only public entries
- [x] An unauthenticated visitor opening a protected page is redirected before any protected content renders
- [x] A signed-in User can still reach the authentication pages, so they can sign out and back in as somebody else
- [x] The proxy performs only a local claims check, with no network or database call, because it also runs on prefetches
- [x] The Data Access Layer asks the provider directly and is used by every protected render
- [x] The authenticated page shows who is signed in, so on a shared machine it is obvious whose session is active
- [x] The centralised error-message module exists and carries the messages this ticket needs; no message is formatted inline
- [x] Browser tests cover sign-in success, sign-in failure, and redirect of an unauthenticated visitor, seeding a verified User through the provider's administrative interface
