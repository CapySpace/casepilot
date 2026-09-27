<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/` in this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Design system

`DESIGN.md` at the repo root is the design system: palette, type scale, component stylings and
layout. Read it before building or changing any interface.

Its tokens are already wired into `app/globals.css` and the shadcn/ui components in
`components/ui/`. Use the token — `bg-primary`, `text-muted-foreground`, `rounded-lg`, `gap-lg`,
`font-heading` — never a raw hex or an arbitrary pixel value. If a design calls for something the
tokens cannot express, add the token and record why in `DESIGN.md`; do not reach past them.

Its central discipline: **colour means status, and status alone.** Decorative colour breaks it.
