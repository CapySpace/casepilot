# 05: Email verification

**What to build:** A newly registered User opens the email CasePilot sent them, follows the link,
and arrives inside the application already signed in. Registration and first use become one
continuous motion.

The confirmation endpoint is a route handler with no interface. It reads a one-time token hash and a
type from the query string, verifies the token with the provider, and redirects onward to a
destination also carried in the query string. Signup confirmations route onward into the
authenticated area. This single handler replaces the separately imagined verification page and
callback route, and ticket 06 will extend it to recovery tokens rather than adding a second one.

**Blocked by:** 04 (Registration).

**Status:** ready-for-agent

- [ ] Following the link in the verification email verifies the address and signs the User in
- [ ] A verified User lands in the authenticated area without a further navigation step
- [ ] The confirmation endpoint distinguishes token types and honours the onward destination it is given
- [ ] An invalid link is rejected with a plain-language explanation that tells the User to request a new one
- [ ] An expired link is rejected with a plain-language explanation that makes clear the link was time-limited
- [ ] Following a verification link again after verifying is handled gracefully, with no alarming error
- [ ] A tampered or already-consumed token cannot be replayed
- [ ] Once verified, the User can sign in normally
- [ ] Most tests mint tokens through the provider's administrative interface for speed and determinism
- [ ] Exactly one test reads the local mail catcher and asserts that registering genuinely produces an email containing a working confirmation link
