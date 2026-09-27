# Supabase Auth as the identity provider

CasePilot needs accounts, email verification and password recovery before anything else can be
built. We use Supabase Auth rather than rolling our own or using a dedicated identity vendor,
because Supabase Postgres is already the intended store for Projects, Cases, Builds and Attempts —
so identity lives beside the data it guards, and row-level security remains available to later
phases without a second system of record.

## Consequences

- **Lock-in is real.** Password hashes, sessions, and email templates live inside Supabase.
  Moving providers later means every user re-authenticates; this is not a swap you make in a
  sprint.
- **We do not control the duplicate-signup response, and it changed under us.** This ADR
  originally recorded that, with email confirmation on, `signUp()` for an existing confirmed user
  returns an obfuscated user object rather than an error — the provider doing anti-enumeration for
  us. **That is no longer true.** Measured against Supabase CLI 2.117 while implementing
  registration:

  | Address | Response | Email sent |
  | --- | --- | --- |
  | New | user, no session | yes |
  | Exists, unconfirmed | the same user, no error | yes, resent |
  | Exists, confirmed | error `user_already_exists` | no |

  So the provider now discloses exactly what the spec says it must not. There is no configuration
  flag to restore the old behaviour. The application therefore enforces the property itself: the
  registration action treats `user_already_exists` as success and shows the same check-email page
  it shows a genuine registration. See `app/(auth)/sign-up/actions.ts`.

  Two consequences we accepted rather than worked around:

  - **An unconfirmed address is emailed again.** The ticket's criterion says "sends no email", and
    on that path it is literally false. The recipient is the person who asked to register in the
    first place, the message says nothing about a second attempt, and the page an enumerator sees
    is identical either way — so nothing is disclosed. Telling an existing User that somebody tried
    to register with their address is the friendlier behaviour, and is deferred by the spec.
  - **The profile trigger's NOT NULL name is a gate on every creation path.** A caller that inserts
    into `auth.users` without a `full_name` in its metadata gets an aborted insert, which Supabase
    surfaces as an opaque `unexpected_failure`. That includes Studio's "Add user" and any future
    invite or single-sign-on path. It is the intended trade — a User with no name attached is worse
    than a loud failure — but it is a real cost, and it already forced the test seeding helper to
    supply metadata.

- **The provider will change a password for any session, so the application does not.**
  `secure_password_change` is off, which is its default. That setting governs *reauthentication*,
  and an earlier version of this ADR wrongly cited the spec's "session policy takes the provider's
  defaults" to justify accepting it — that line is about token lifetime and inactivity timeout, and
  does not reach this.

  Left alone, it meant `/reset-password` worked for anybody holding a session rather than only for
  somebody who had followed a recovery link, so borrowed access to an unlocked machine became
  permanent access. The application now requires the session to have come from a link: the access
  token's `amr` claim records how a session was established (`otp` for a verified recovery token,
  `password` for an ordinary sign-in), the provider signs it, and both the page and the action
  check it.

  Changing a password *while signed in* remains a feature Phase 1 does not have. It needs its own
  interface and its own criteria, and turning `secure_password_change` on is part of building it.

- **Every failed one-time token looks the same.** `verifyOtp` returns `otp_expired` for a consumed
  token, a tampered one, outright garbage, and a token presented with the wrong type — measured
  against the running stack. They cannot be told apart.

  Tickets 05 and 06 each ask for an invalid link and an expired link to be explained differently.
  That distinction is not available from the provider, so CasePilot makes the one it can: a link
  that is malformed or carries a type we never issue is caught before the provider is called and
  called invalid, and anything the provider refuses gets a single message covering expiry and reuse
  together. Claiming to know which of the two happened would be a guess dressed as an explanation.

- **Renewal is reliable in use and unproven when idle.** A rotating refresh token keeps a User in
  continuous use signed in indefinitely; `npm run verify:renewal` demonstrates it against a
  five-second token. Going idle is different: past expiry, renewal stops working once more than
  `refresh_token_reuse_interval` has elapsed, which points at the browser holding a token one
  rotation behind rather than at the interval itself. Unresolved, and recorded in ticket 07 rather
  than papered over.

  The lesson generalises beyond this case: anti-enumeration is ours to guarantee, not the
  provider's to supply. A criterion that depends on a third party's error-shaping is one upgrade
  away from silently inverting, so the browser test asserts the two outcomes are identical rather
  than asserting which error code came back.
