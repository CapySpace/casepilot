@AGENTS.md

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
