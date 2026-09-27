# 04: Registration

**What to build:** A stranger creates a CasePilot account with their full name, email address and a
password, agrees to the Terms of Service and Privacy Policy, and lands on a page telling them to
check their email. Their name and their agreement are recorded. They cannot yet sign in, because
their address is unverified.

Registration follows the design rather than the original brief: there is no confirm-password field —
the visibility toggle replaces it — and full name and terms consent are both present. The full name
is stored in a profile record rather than provider metadata, because later phases join display names
into Case and attempt queries and provider metadata is not joinable in SQL.

Duplicate registration must not disclose that an address is already in use. With confirmation
enabled the provider deliberately returns an obfuscated user object, sends no email and raises no
error; the application shows the same success state it shows a genuine new registration. This
replaces the original brief's "duplicate account errors are handled", and is a security property,
not an oversight — CasePilot holds a company's defect data, and a form that confirms which
colleagues have accounts is a real leak.

**Blocked by:** 02 (Sign in and the protected shell).

**Status:** ready-for-agent

- [x] A prospective User can register with full name, email and password
- [x] The form matches the design: full name, work email, password with a visibility toggle, a terms agreement checkbox, and a link to sign-in
- [x] The password rule is stated on the form before submission and matches what is actually enforced
- [x] Password validity updates live as the User types, without a round trip
- [x] Registration is rejected without an email address, with a malformed email address, or with a password that fails the rule
- [x] Validation runs again on the server, because browser validation is not a security control
- [x] The account cannot be created without agreeing to the terms
- [x] A profile record is created automatically for every new User, holding their full name and the timestamp and version of the terms they accepted
- [x] Registering with an already-registered address produces exactly the same visible outcome as a new registration, discloses nothing, and sends no email
- [x] After registering, the User lands on a check-email page that survives a refresh and explains what to do next
- [x] A registered but unverified User still cannot sign in
- [x] Browser tests cover successful registration, each validation failure, the terms gate, and duplicate registration non-disclosure
