# Phase 1 — Authentication

Status: ready-for-agent

## Problem Statement

CasePilot holds a company's test Cases, builds, defects and execution history — the record of what
their software does and where it is broken. None of that can exist until there is a way to tell one
User from another, and no User can be let near a Project until CasePilot knows who they are and that
they control the email address they claimed.

Today there is nothing: the application is a bare starter with a single unprotected page. A person
cannot create an account, cannot sign in, cannot recover a forgotten password, and there is no notion
of a signed-in session at all. Every feature planned after this one assumes an identified User, so
until that exists, nothing else can be built.

## Solution

A complete email-and-password authentication foundation, built on Supabase Auth, that carries a
person from "never heard of CasePilot" to "signed in, with a session that survives a refresh" and
back out again safely.

A prospective User registers with their name, email and a password. CasePilot sends a verification
email; until they follow its link, they cannot sign in. Once verified they sign in and reach the
authenticated area of the application, and their session persists across refreshes and restarts
until they explicitly sign out. A User who forgets their password requests a reset link by email,
follows it, chooses a new password, and signs in with it.

Everything behind the authentication boundary is closed by default: a route is protected unless it
has been explicitly declared public, so a route added in a later phase is guarded from the moment it
exists rather than from the moment someone remembers to guard it.

## User Stories

### Registration

1. As a prospective User, I want to create a CasePilot account with my name, email and a password, so that I can begin using the product.
2. As a prospective User, I want to give my full name at registration, so that my colleagues see a person rather than an email address when they read Case attempt history.
3. As a prospective User, I want to be told the password rules before I submit, so that I am not rejected after the fact for a rule I could not have known.
4. As a prospective User, I want to see whether my password meets the rules as I type it, so that I can fix it without a round trip to the server.
5. As a prospective User, I want to reveal the password I am typing, so that I can check a long password before committing to it.
6. As a prospective User, I want to be stopped from registering without an email address, so that I do not create an account I can never verify.
7. As a prospective User, I want to be stopped from registering with a malformed email address, so that the verification link actually reaches me.
8. As a prospective User, I want to be stopped from registering with a password that is too weak, so that my account is not trivially compromised.
9. As a prospective User, I want to have to agree to the Terms of Service and Privacy Policy before my account is created, so that the basis on which I am using CasePilot is explicit.
10. As a prospective User, I want my agreement to those terms to be recorded, so that both sides can later establish what I agreed to and when.
11. As a prospective User, I want registration to fail safely if I submit the form twice, so that I do not end up with a confusing half-created account.
12. As a User whose email is already registered, I want CasePilot not to reveal that fact to whoever submitted the form, so that my colleagues' email addresses cannot be harvested by guessing at the signup page.

### Email verification

13. As a prospective User, I want to be told clearly that a verification email has been sent and where to look for it, so that I am not left staring at a form wondering whether anything happened.
14. As a prospective User, I want that "check your email" state to survive a page refresh, so that I do not lose my place by reloading or coming back later.
15. As a prospective User, I want to verify my email by following a single link, so that activating my account takes one click and no copied codes.
16. As a prospective User, I want to be taken into the application once my email is verified, so that verification and first use are one continuous motion.
17. As a prospective User, I want a clear explanation when my verification link is invalid, so that I know to request a new one rather than assume CasePilot is broken.
18. As a prospective User, I want a clear explanation when my verification link has expired, so that I understand the link was time-limited rather than wrong.
19. As a User who has already verified, I want following an old verification link again to be handled gracefully, so that a stale email in my inbox does not produce an alarming error.
20. As an unverified prospective User, I want to be prevented from signing in, so that nobody can use an email address they do not control.

### Sign in

21. As a verified User, I want to sign in with my email and password, so that I can reach my Projects.
22. As a User, I want to be taken to the authenticated area immediately after signing in, so that signing in does not require a further navigation step.
23. As a User, I want a single, non-specific message when my credentials are wrong, so that an attacker cannot learn whether an email address exists by comparing error messages.
24. As a User, I want to reveal the password I am typing on the sign-in form, so that I can correct a typo instead of guessing at dots.
25. As a User, I want a link to password recovery directly on the sign-in form, so that a forgotten password does not become a dead end.
26. As a prospective User who lands on sign-in by mistake, I want a visible route to registration, so that I can get to the right form without hunting.

### Sign out

27. As a signed-in User, I want to sign out, so that I can leave a shared or borrowed machine safely.
28. As a User who has signed out, I want my session genuinely removed rather than merely hidden, so that the back button does not return me to my Projects.
29. As a User who has signed out, I want to be returned to the sign-in page, so that it is obvious what state I am now in.
30. As a User who has signed out, I want any subsequent attempt to open a protected page to send me to sign-in, so that my data is not reachable by URL.

### Password recovery

31. As a User who has forgotten my password, I want to request a reset link using only my email address, so that I can recover without contacting anybody.
32. As a User requesting a reset, I want the same confirmation message whether or not the address is registered, so that the form cannot be used to discover who has an account.
33. As a User, I want the reset link to arrive by email, so that only someone with access to my inbox can change my password.
34. As a User following a reset link, I want to be taken straight to a form for choosing a new password, so that recovery is a single uninterrupted flow.
35. As a User choosing a new password, I want the same rules and the same live feedback as at registration, so that the experience is consistent and predictable.
36. As a User choosing a new password, I want to confirm it, so that I do not lock myself out with a typo I cannot see.
37. As a User, I want an invalid reset link to be rejected with a clear explanation, so that I know to request a fresh one.
38. As a User, I want an expired reset link to be rejected with a clear explanation, so that I understand why a link I saved last week no longer works.
39. As a User who has reset my password, I want to be able to sign in with the new one immediately, so that recovery actually completes.
40. As a User, I want a used or tampered reset link to be useless to anyone else, so that an intercepted email cannot be replayed against my account.

### Session

41. As a signed-in User, I want my session to survive a page refresh, so that reloading does not throw me out of the application.
42. As a signed-in User, I want my session to survive closing and reopening the browser, so that I am not asked to sign in several times a day.
43. As a signed-in User, I want my access to be renewed silently in the background, so that I am never interrupted mid-task by an expiry I did not cause.
44. As a User whose session has genuinely expired, I want to be told so in plain language and returned to sign-in, so that I understand what happened rather than seeing a broken page.
45. As a User, I want CasePilot to know who I am on the server as well as in the browser, so that what I am shown is decided by my real identity rather than by anything the browser claims.

### Protected routes

46. As a signed-out visitor, I want to be redirected to sign-in when I open a protected page, so that I cannot see another company's data by typing a URL.
47. As a signed-out visitor, I want that redirect to happen before the protected page renders, so that I never glimpse content I am not entitled to.
48. As a signed-in User, I want the authentication pages to be reachable without being bounced, so that I can still sign out and back in as a different User.
49. As a developer adding a route in a later phase, I want it to be protected by default, so that forgetting to guard it locks people out rather than silently exposing data.
50. As a signed-in User, I want to see who I am signed in as, so that on a shared machine I can tell at a glance whose session is active.

### Errors and trust

51. As a User, I want every authentication failure explained in plain language, so that I know what to do next.
52. As a User, I want never to be shown a raw technical error from the authentication provider, so that the product feels finished and leaks nothing about its internals.
53. As a User hitting an unanticipated failure, I want a sensible generic message rather than a blank screen, so that the application degrades gracefully.
54. As a User, I want CasePilot to make no security or compliance claims it cannot substantiate, so that I can trust the claims it does make.

## Implementation Decisions

**Identity provider.** Supabase Auth owns User records, password storage, verification and recovery,
and session issuance, per ADR-0001. The application never stores passwords and never implements
credential checking itself.

**Framework reality.** This is Next.js 16 on the App Router. The `middleware` file convention is
deprecated and renamed to `proxy`; all request-level interception uses the proxy convention. This
contradicts every current Supabase + Next.js guide, which still shows the middleware name.

**Two-layer enforcement**, per ADR-0002. A default-deny proxy runs on all routes, redirecting
unauthenticated requests unless the path is on an explicit public allow-list covering the
authentication routes and static assets. It performs a local JWT claims check only — no network, no
database — because it also runs on prefetches. Separately, a Data Access Layer exposes a session
verification function that asks Supabase directly and is the authoritative boundary; every protected
render and every privileged action goes through it. Neither layer is redundant: without the proxy,
protected pages flash before redirecting; without the DAL, any route that forgets its own check is
unguarded.

**Mutations run as Server Actions.** All five forms submit to server-side actions which call
Supabase, revalidate the layout and redirect. Validation is duplicated deliberately: in the browser
for live feedback, and again in the action because browser validation is not a security control.

**Supabase client integration** uses the SSR-capable client with the batched cookie interface
(`getAll`/`setAll`), not the older single-cookie form. Separate client factories exist for browser
context, server context and the proxy. The proxy verifies claims locally; the DAL fetches the user.
Omitting the claims call in the proxy causes intermittent spurious sign-outs under server rendering.

**Credentials.** The browser-safe publishable key and the Supabase URL are public environment
values. The secret key is server-only, carries no public prefix, and is used exclusively by the test
suite for administrative link generation. Nothing in the application's rendering tree may import it.

**Routes.** Five pages — sign-up, sign-in, forgot-password, reset-password (choosing a new password)
and check-email (the post-registration state) — plus one route handler at the confirmation endpoint
that has no UI. That handler serves *both* email flows, distinguished by a type parameter: it reads
a token hash and a type from the query string, verifies the one-time token, and redirects onward to
a target also supplied in the query string. Signup confirmations route onward to the authenticated
area; recovery confirmations route onward to the reset-password form. This replaces the separately
imagined "verify" page and "callback" route with a single handler.

**Registration fields** follow the design rather than the original brief: full name, email, password
with a visibility toggle, and a Terms of Service consent checkbox. There is no confirm-password
field at registration — the visibility toggle replaces it. There is no "remember this device"
option; session lifetime is uniform.

**Password policy** is a minimum of eight characters containing letters and digits, enforced both in
the application and in the provider's own policy so that the API cannot be bypassed by calling it
directly. The interface copy states this rule exactly. Note this is marginally stricter than the
design's drawn hint of "a number or symbol": the provider offers no "digit or symbol" option, and
enforcing nothing at the API was judged the worse trade.

**User profile.** A profile record is keyed one-to-one to the Supabase user and created
automatically by a database trigger on user insert. It holds the full name and the terms acceptance
timestamp and version. The full name lives here rather than in provider metadata because later
phases join display names into Case and attempt queries, and provider metadata is not joinable in
SQL.

**Verification is mandatory.** Email confirmation is enabled, so registration returns a User with no
session and the flow ends on the check-email page rather than in the application.

**Duplicate registration does not disclose account existence.** This was planned on the assumption
that the provider returns an obfuscated user object for an already-registered address, sending no
email and raising no error. Implementation found that it no longer does — a confirmed address
returns `user_already_exists` — so the application enforces the property instead. See ADR-0001 for
the measured behaviour. The original text follows, for the reasoning it carries:

> With confirmation enabled the provider returns an obfuscated user object for an already-registered
> address, sending no email and raising no error. The application surfaces the same success state it shows a genuine new
registration. The original acceptance criterion "duplicate account errors are handled" is replaced
by "duplicate registrations are handled without disclosing account existence". The friendlier
alternative — emailing the existing User to say someone tried to register with their address — is
deferred.

**Session policy** takes the provider's defaults: a short-lived access token with a rotating refresh
token that persists until sign-out. No inactivity timeout.

**Error translation** is centralised in a single module mapping provider error codes to the
user-facing strings, with an explicit fallback for anything unrecognised. No action formats its own
message inline.

**Interface components** come from shadcn/ui, themed from the tokens recorded in the repository's
design system document. Chosen now, while the surface is five simple forms, because later phases
need tables, dialogs, dropdowns, toasts and a command palette, and retrofitting a component library
beneath hand-rolled forms is materially worse than adopting one up front.

**Landing destination.** Phase 1 ends at a deliberate placeholder: a single protected page showing
who is signed in and offering sign-out, explicitly marked as temporary. A Project is the tenant
boundary that owns Cases, and Projects arrive in Phase 2, so there is genuinely nothing else to show
yet.

**Local environment.** Development and tests run against the local Supabase stack. Its configuration
— site URL, redirect allow-list, password policy, mandatory confirmation and both email templates —
is committed to the repository so that a new contributor starts the stack and has a correctly
configured environment. Per-developer secrets stay in an ignored local environment file. The email
rate limit is raised locally so the test suite does not stall against the default of two per hour.

## Testing Decisions

**What makes a good test here.** A test asserts only what a User could observe: text on screen, the
URL they end up at, whether a protected page is reachable. It must not reach for internals — not the
shape of a session object, not which function called which, not whether a particular cookie exists.
A test that would fail if the implementation were swapped for an equivalent one is testing the wrong
thing. Crucially, the authentication provider is never mocked: the value of these tests lies almost
entirely in exercising its real behaviour, and a mock would cheerfully confirm behaviour the real
provider does not have — the obfuscated duplicate-registration response being exactly such a case.

**Two seams, confirmed with the developer.**

*The browser is the primary seam.* End-to-end tests drive the real application against the real
local stack. All six flows and nearly all acceptance criteria live here: registration and its
validation failures, verification including invalid and expired links, sign-in success and failure,
sign-out and the unreachability of protected pages afterwards, recovery end to end, session survival
across reload, and redirect of unauthenticated visitors. A single test crossing this seam exercises
the form, the action, the proxy, the DAL, the provider, cookies and redirects together.

*Pure functions are a narrow second seam.* Unit tests cover the validation rules and the error-code
translation map, and exist only for cases the browser cannot reach economically — expired links,
expired sessions, and the remaining catalogue of user-facing strings whose provider error states are
impractical to induce through a genuine flow. Input in, string out.

**Deliberately not seams:** no mocked provider client, no isolated testing of Server Actions, no
component-level tests. Two seams rather than one is a conscious concession; forcing the error
catalogue through the browser would mean either contorted setup or no coverage.

**Obtaining verification and recovery links.** Tests that merely require a verified User mint tokens
directly through the provider's administrative interface, bypassing email for speed and determinism.
Exactly one test goes the long way round, reading the local mail catcher to assert that registering
genuinely produces an email containing a working confirmation link. ("The long way round" means
driving a flow *through* an email. Counting messages to assert that one was **not** sent — which
registration does, to prove a duplicate discloses nothing — is not that, and is not covered by the
"exactly one" above.) Disabling confirmation in the
test environment is not acceptable — the verification criteria would then be untested by
construction.

**Prior art: none.** These are the first tests in the repository. They set the pattern every later
phase will copy, which is a reason to get the seam discipline right now rather than later.

## Out of Scope

- Projects, Project membership and invitations. A Project is the tenant boundary that owns Cases;
  creating and joining one is Phase 2. Phase 1 produces Users and nothing else.
- Any real authenticated interface. The landing page is an acknowledged placeholder.
- The hosted Supabase project and anything deploy-related: production URLs, redirect allow-lists for
  a deployed domain, and CI secrets. There is no deploy target yet, and a hosted project's URL
  configuration cannot be correct until one exists.
- Social or single sign-on providers, and multi-factor authentication.
- "Remember this device", and any session length other than the provider default.
- Notifying an existing User that somebody attempted to register with their address.
- Rate limiting beyond provider defaults, and any tuning of the raised local email limit for
  production.
- The content of the Terms of Service and Privacy Policy pages. The registration form links to them
  and records acceptance; writing them is not an engineering task.
- The Help & Support destination linked from both authentication screens.
- SOC-2 and HIPAA trust badges drawn on the designs. They are removed until substantiated; the
  transport-security statement remains.

## Further Notes

**Vocabulary.** Use the repository glossary throughout: **User**, **Project**, **Case**. *Account* is
deliberately retired — it was simultaneously the person, the credentials and the tenant. *Workspace*
is retired in favour of *Project*, which means the design's on-screen copy needs adjusting where it
says "workspace". And **Case always means test case** — the design system's own prose previously
drifted into describing CasePilot as legal-tech, because nothing had pinned the word down.

**The design and the original brief disagreed**, and the design generally won on fields while the
brief won on flows. The resolved differences are recorded under Implementation Decisions; the ones
most likely to surprise someone reading the original brief are the removal of confirm-password at
registration, the addition of full name and terms consent, the removal of the remember-device
option, and the collapse of the verify page and callback route into one confirmation handler.

**Provisioning is a prerequisite.** The local stack does not exist in the repository yet. A wizard
has been written that starts Docker, initialises the stack, applies all the configuration above and
writes the local environment file. It must run before any of this work can begin, and its output —
the stack configuration and both email templates — belongs in version control.

**The design system document is not yet referenced from the agent instructions**, so an agent
building these forms will not automatically read it. That should be fixed before implementation
starts, or the forms will be built without the tokens they are supposed to use.

**The Phase 1 / Phase 2 seam is thin by design.** At the end of this work CasePilot is an
application a User can register for, verify, sign into and sign out of — and in which there is
nothing to do. That is the correct foundation, but it is worth knowing in advance that Phase 1 ships
nothing demonstrable to a stakeholder.
