# CasePilot

Test-execution tracking for software QA teams: what was tested, against which build, by whom, and
what happened — with a history that can be audited rather than overwritten.

Next.js 16 (App Router) and Supabase. **Case always means test case** — see `CONTEXT.md` for the
glossary, and `docs/adr/` for the decisions that shaped the architecture.

## Getting started

You need Node.js 22.12 or later — an even-numbered LTS. Next.js itself is happy on 20.9, but the
unit test runner is not. You also need the [Supabase CLI](https://supabase.com/docs/guides/cli) and
Docker running.

```bash
npm install
cp .env.example .env.local
supabase start
npm run dev
```

The app is at http://localhost:3000. The stack's own URLs — Studio, the mail catcher — are printed by
`supabase start`, and `supabase status` prints them again.

Everything the stack needs is in `supabase/config.toml` and `supabase/templates/`, so there is no
dashboard to click through. `.env.local` holds no per-developer secrets either: the values in
`.env.example` are the CLI's fixed local ones, the same on every machine.

## Running the tests

```bash
npm test          # both suites
npm run test:unit # Vitest
npm run test:e2e  # Playwright
```

Both need a running stack (`supabase start`). The browser suite starts the dev server itself and
reuses one you already have running.

The provider is **never mocked**. The value of these tests is almost entirely in exercising
Supabase's real behaviour — a mock would cheerfully confirm behaviour it does not have. So a failing
suite with a stopped stack means the stack is stopped, not that anything is broken.

Two seams, and only two:

- **The browser** (`tests/e2e/`) is the primary seam, and where nearly every acceptance criterion
  lives. One test crossing it exercises the form, the Server Action, the proxy, the Data Access
  Layer, Supabase, cookies and redirects together.
- **Pure functions** (`tests/unit/`) are a narrow second seam — validation rules and error-message
  translation, input in and value out. They exist only for what the browser cannot reach
  economically, such as expired links.

Deliberately not seams: no mocked provider client, no isolated Server Action tests, no
component-level tests.

If a test would fail after swapping the implementation for an equivalent one, it is testing the wrong
thing. Assert what a User could observe — text on screen, the URL they land on, whether a protected
page is reachable — and nothing about the shape of a session object or which function called which.

## Other commands

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
supabase db reset   # rebuild the local database from scratch
```

## Where things are

| Path                | What it holds                                                         |
| ------------------- | --------------------------------------------------------------------- |
| `app/`              | Routes, pages and Server Actions                                      |
| `proxy.ts`          | Default-deny request interception. Runs on every route                |
| `components/ui/`    | shadcn/ui components, themed from `DESIGN.md`                         |
| `lib/auth/`         | The session boundary, the public route list and the message catalogue |
| `lib/supabase/`     | Client factories for browser, server and proxy context                |
| `supabase/`         | Local stack configuration and email templates                         |
| `tests/unit/`       | Vitest — pure functions only                                          |
| `tests/e2e/`        | Playwright — whole flows against the real stack                       |
| `tests/support/`    | Seeding helpers. The only place the secret key is used                |
| `CONTEXT.md`        | The glossary. Read before naming anything                             |
| `DESIGN.md`         | The design system. Read before building any interface                 |
| `docs/adr/`         | Architecture decisions, including why authentication is enforced twice |
| `.scratch/`         | Specs and tickets                                                     |

Two things will look wrong to anyone who knows Supabase and Next.js, and both are deliberate:
request interception lives in `proxy.ts`, not `middleware.ts` (Next.js 16 renamed the convention),
and authentication is checked in two places rather than one. `docs/adr/0002-two-layer-auth-enforcement.md`
explains why neither is redundant.
