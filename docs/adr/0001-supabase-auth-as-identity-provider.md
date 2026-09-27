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
- **We do not control the duplicate-signup response.** With email confirmation on, `signUp()` for
  an existing confirmed user returns an obfuscated user object rather than an error — deliberate
  anti-enumeration behaviour. We accepted it (see the spec's reworded duplicate-signup criterion)
  rather than disabling the protection to get a friendlier message.
