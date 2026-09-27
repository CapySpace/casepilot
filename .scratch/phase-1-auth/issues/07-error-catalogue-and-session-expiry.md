# 07: Error catalogue and session expiry

**What to build:** Every authentication failure in CasePilot speaks plain language, and a User whose
session has genuinely expired is told so and returned to sign-in rather than meeting a broken page.

The message catalogue has been growing ticket by ticket; this one completes it and proves it. A raw
provider error must never reach a User — it makes the product feel unfinished and leaks internals —
and anything unrecognised must still produce something sensible rather than a blank screen.

This ticket also carries the second testing seam. Most of the phase is verified through the browser,
but a handful of states are impractical to induce through a genuine flow — expired links, expired
sessions, and the long tail of provider error codes. Those are covered by unit tests over the
validation rules and the translation map: input in, string out.

**Blocked by:** 06 (Password recovery).

**Status:** ready-for-agent

**Silent renewal is only half met, and is left unticked.** `npm run verify:renewal` compresses the
token lifetime to five seconds and shows that a User in continuous use is renewed on every request
and never interrupted. A User who goes *idle* is a different matter: past expiry, renewal fails
once more than `refresh_token_reuse_interval` has elapsed. Measured with a five-second token, idle
8s renews and idle 11s does not, and raising the reuse interval to 60s makes the 11s case renew —
so the cut-off follows the reuse interval, not the token lifetime. Whether that reaches production
timings, where the token lives an hour, is untested; the mechanism suggests it would, which would
make the idle case exactly the "routine expiry" this criterion is about. Not fixed here because the
cause sits in how refreshed tokens are written back, which wants its own investigation.

- [x] Every user-facing authentication message in the product comes from the central catalogue; none is formatted inline
- [x] No raw provider error text can reach a User under any failure
- [x] An unrecognised provider error produces a sensible generic message rather than a blank screen or a crash
- [x] A User whose session has expired is returned to sign-in with an explanation of what happened
- [ ] Access is renewed silently in the background, so a User is never interrupted mid-task by a routine expiry
- [x] Unit tests cover the validation rules for email and password
- [x] Unit tests cover the translation map, including every catalogued message and the unrecognised-error fallback
- [x] Tests assert only observable behaviour — the message a User sees — never the shape of internal objects or which function called which
- [x] No test mocks the authentication provider; the value of this phase's tests lies in exercising its real behaviour
