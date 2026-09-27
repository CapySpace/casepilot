# 01: Project foundations

**What to build:** A contributor can clone the repository, start the local Supabase stack, run both
test suites, and get green — with the design system and component library in place so that every
later ticket builds forms that look like the designs rather than inventing their own styling.

This ticket delivers no user-facing behaviour. It exists so that the six tickets after it are each a
clean vertical slice instead of half setup. Per ADR-0001 the identity provider is Supabase; per
ADR-0002 request interception uses the proxy convention, not the deprecated middleware one, so the
client factories must cover browser, server and proxy contexts separately.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] The local stack's configuration and both email templates are committed, so a fresh clone starts a correctly configured stack with no manual dashboard work
- [x] Stack configuration enforces: mandatory email confirmation, minimum password length of eight with letters and digits, the local site URL, an allow-list covering the authentication routes, and an email rate limit raised enough not to stall the test suite
- [x] Both email templates point at the confirmation endpoint, carrying a token hash, a type, and an onward destination
- [x] Supabase client factories exist for browser, server and proxy contexts, using the batched cookie interface rather than the single-cookie form
- [x] The secret key is server-only, carries no public prefix, and nothing in the application's rendering tree imports it
- [x] The component library is installed and themed from the repository's design system document, not from its own defaults
- [x] A unit test runner and a browser test runner are both configured and each executes a trivial smoke test green
- [x] The agent instructions reference the design system document, so later tickets read it automatically
- [x] A contributor following the README can go from clone to both suites green without asking anyone
