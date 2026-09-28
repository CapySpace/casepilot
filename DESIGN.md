# Design System: CasePilot
**Project ID:** projects/10239226495872133651

> Synthesised from the Stitch project's `designTheme` and verified pixel-by-pixel against the
> **CasePilot — Dashboard (Sidebar Layout)** screen
> (`projects/10239226495872133651/screens/ee86c84eebb543108ecb18951b5ea1be`, 2560×2048, desktop).
> Every hex value below is one that actually renders in the product, not an aspirational token.

## 1. Visual Theme & Atmosphere

CasePilot is a **test-execution command centre**: software QA teams track test cases across builds,
record pass/fail attempts, and chase defects. The design language serves that job — high-density
operational data that must stay readable under pressure and leave an audit trail.

The mood is **calm, clinical and airy** — a laboratory bench rather than a cockpit. Light dominates
absolutely: pure white and cool porcelain together account for over four-fifths of the canvas. Content
floats in generously rounded white cards on a faintly blue-tinted ground, separated by air rather than
by rules or heavy chrome. Nothing is boxed in that doesn't need to be.

Against that quiet field, **colour is rationed and load-bearing**. The interface is very nearly
monochrome-navy until a *state* needs declaring, at which point saturated emerald, crimson, amber or
violet appear at small scale — a chip, a dot, a four-pixel bar segment, a left-edge stripe. Because the
background never competes, a single 12px status dot carries real weight. This is the system's central
discipline: **colour means status, and status alone.** Decorative colour would break it.

Density is deliberately mixed. Chrome is relaxed and roomy — 24px card padding, tall nav rows, wide
gutters — while data regions tighten into scannable rows. The result reads as unhurried at the frame
and efficient at the centre. Depth is nearly flat: elevation is communicated by a hairline border and a
barely-there ambient shadow, never by drama. Trust here comes from precision and restraint, not weight.

## 2. Color Palette & Roles

### Foundation

* **Cool Porcelain (`#f8f9ff`)** — the application canvas. A white so faintly cooled toward blue that it
  reads as neutral, yet gives white cards something to sit against. ~24% of the screen.
* **Pure Sheet White (`#ffffff`)** — every elevated surface: cards, the sidebar, table bodies, inputs.
  ~57% of the screen. The dominant material.
* **Midnight Slate Navy (`#0b1c30`)** — all primary typography, headings and active icons. Replaces pure
  black with a warmer, more authoritative dark that sits comfortably on cool surfaces.
* **Muted Harbour Slate (`#4e5f7a`)** — secondary and supporting text: module paths, timestamps, field
  placeholders, section labels, column headers. The workhorse for anything subordinate.
* **Whisper Periwinkle (`#eff4ff`)** — secondary button fill, metadata chips, attachment rows. The
  system's "quiet container": present enough to group, too pale to compete.
* **Selected Row Ice (`#eaf2ff`)** — row selection and hover tint in data tables.
* **Dormant Grey (`#b8bfca`)** — the *Not Run* state, and the only truly desaturated accent. Signals
  "nothing has happened here yet" by visibly withholding colour.

### Brand & Primary Action

* **Signal Emerald (`#00c696`)** — the brand colour. Vivid, optimistic turquoise-green reserved for the
  logo mark, the *Passed* status dot, and the passing segment of progress bars. This is the colour the
  product wants you to be chasing.
* **Deep Pine Green (`#006c50`)** — the *functional* primary. Signal Emerald is too light to carry white
  text or small type, so every committed action darkens to this: the solid fill of the primary button,
  active-navigation text and icons, the selected-row edge stripe, and *Passed* chip text. Think of the
  pair as one identity at two contrast levels — emerald announces, pine acts.
* **Pale Mint Wash (`#d9f7ef` sidebar / `#d4f4ef` chips)** — the tinted container behind anything green:
  active nav item, *Passed* chip, resolved-defect tag.

  > **In code.** The two tints are two tokens, because they mean different things. The chip value is
  > `--passed-container` and belongs to the status scale. The sidebar value is `--brand-wash`
  > (`bg-brand-wash`), added when the Project sidebar needed the active item's pill: it is *brand*,
  > not status, so an active navigation item does not claim that anything passed. Reaching for
  > `bg-passed-container` there would put a verdict in the navigation.

### Navigation & Reference

* **Navigational Sapphire (`#005bb2`)** — every identifier and link: case IDs (`TC-101`), build versions
  (`#v2.4.0-rc3`), defect references on non-failing rows. Deliberately *not* a status colour — blue means
  "this is a thing you can go to," which is why it never appears in the status scale.

### The Status Scale

The most important structure in the system. Five mutually exclusive execution states, each expressed as a
triplet — a **saturated marker** (dot, bar segment, medallion), a **pale container**, and a **deep
on-container text** colour. The triplet is what makes a chip legible at 12px while staying quiet.

| Status | Marker | Container | Text |
| --- | --- | --- | --- |
| **Passed** — Verdant Confirmation | `#00c696` | `#d4f4ef` | `#006c50` |
| **Failed** — Alarm Crimson | `#ba1a1a` | `#ffe9e6` | `#ba1a1a` |
| **Blocked** — Amber Caution | `#f59e0b` | `#fef3c7` | `#78350f` |
| **Skipped** — Violet Bypass | `#a855f7` | `#f6eefe` | `#9333ea` |
| **Not Run** — Dormant Grey | `#b8bfca` | `#eff4ff` | `#4e5f7a` |

Read the scale as a gradient of *agency*: green and red are verdicts the system reached, amber and violet
are conditions that prevented a verdict, grey is absence. Amber and violet are intentionally
non-judgemental — a blocked or skipped case is not a failure, and colouring it red would lie.

**Defect references inherit their row's status colour**: `Jira-409` renders sapphire on a passed row,
`PAY-8821` crimson on a failed row, and `GH-3094` in **Ochre Link (`#b45309`)** on a blocked row. The same
reference is tinted by the state it was found in, so a scanning eye picks up severity without reading.

**Severity is a separate axis** sharing crimson: `P0 Critical` is set in `#ba1a1a`, while `P1 High` and
`P2 Medium` drop to Midnight Slate Navy. Only the top severity earns colour.

## 3. Typography Rules

Three families, each with a strictly separated job.

**Plus Jakarta Sans — structure and voice.** All headings, card titles, button labels, nav items and the
wordmark. Geometric and slightly warm; carries authority without stiffness. Weights climb with
importance — `800` for hero display, `700` for headlines and card titles, `600` for section titles and
buttons. Its signature is **tight negative tracking that intensifies with size**: `-0.03em` at 56px
display, `-0.02em` at 40px, `-0.015em` at 24px, easing to `-0.005em` at 18px. Large type pulls together
into a deliberate editorial block rather than sprawling.

* Display hero 56px/64px · 800 · `-0.03em` (36px/44px mobile)
* Headline lg 40px/48px · 700 · `-0.02em` (28px/36px mobile)
* Headline md 24px/32px · 700 · `-0.015em`
* Headline sm 20px/28px · 600 · `-0.01em`
* Title lg 18px/24px · 600 · `-0.005em`

**Inter — data and controls.** All body copy, table cells, form fields, timestamps and labels. Chosen for
neutral, even colour across dense rows; it disappears so the data reads. Tracking is flat (`0em`) at body
sizes and opens up as type shrinks, keeping small text airy.

* Body lg 16px/24px · 400 · `0em` · Body md 14px/20px · 400 · Body sm 12px/16px · 400 · `0.01em`
* Label md 13px/16px · 600 · `0.01em` · Label sm 11px/14px · 600 · `0.04em`

Label sm's generous `0.04em` is what makes uppercase eyebrow labels (`WORKSPACE`, `NAVIGATION`) read as
quiet structural signposts rather than shouting.

**A monospace face — identifiers.** Applied consistently to every machine-generated token: case IDs
(`TC-101`), version refs (`#v2.4.0-rc3`), defect keys (`Jira-409`, `PAY-8821`), filenames
(`auth_timeout_trace.png`), counts (`128 Total Cases`) and the version badge (`v0.1`). The shift in
texture tells you instantly that a string is a *reference you could copy*, not prose. This role is real
and pervasive in the product but was **not declared in the Stitch theme**. Now pinned to **JetBrains
Mono**, loaded in the root layout and exposed as `--font-mono`, so it cannot drift between screens.

**Numerals:** tabular lining figures (`tnum`) throughout all metrics, counts, timestamps and IDs, so
columns never shift as values update during a run.

## 4. Component Stylings

* **Buttons:** Subtly rounded rectangles (`0.5rem` / 8px), never pills, at a consistent height with
  comfortable horizontal padding and a leading icon.
  * *Primary* — solid **Deep Pine Green (`#006c50`)** with white label and white glyph. One per view,
    reserved for the committing action (`▶ Run / Record Attempt`). Flat fill, no gradient.
  * *Secondary* — **Whisper Periwinkle (`#eff4ff`)** fill with Midnight Slate Navy label and no visible
    border (`＋ New Test Case`, `⧉ Copy Cases from Build…`). Multiple may sit together; they read as a
    calm toolbar rather than competing calls to action.
  * *Full-width footer action* — the secondary treatment stretched across a card foot
    (`＋ Record Attempt #4`), closing a panel with its obvious next step.

* **Cards / Containers:** **Pure Sheet White** surfaces on the porcelain canvas, **generously rounded**
  (`0.75rem`–`1rem`, up to `1.5rem` on large panels), bounded by a hairline cool-grey border and an
  ambient navy-tinted shadow so soft it reads as a held breath rather than a lift. Internal padding
  `1.5rem` (24px). Headers pair a Plus Jakarta Sans title with an optional monospace context chip and a
  right-aligned status icon, then a hairline divider before the body.

* **Inputs / Forms:** White fill, hairline cool-grey stroke, `0.5rem` corners, ~12×16px padding, leading
  magnifier or field icon, placeholder in Muted Harbour Slate. Filter controls mirror the input's stroke
  and radius exactly, so a search field and a `Status` filter button read as one continuous control strip.

* **Status Chips:** **Fully pill-shaped (`9999px`)** — the only element allowed full curvature, which
  makes state instantly identifiable by silhouette alone. A saturated dot leads the label, both drawn
  from the status triplet in §2. Count badges follow the same rule: `18` open defects sits in the Failed
  container as a rose pill, while a neutral `128` stays plain slate.

* **Data Tables:** Sticky header in porcelain with Muted Harbour Slate column labels and a hairline
  bottom divider. Rows are separated by hairlines, generously tall to fit two-line titles with a
  subordinate module path (`Auth / Security`) beneath. **Selection is marked by a solid left-edge stripe
  in Deep Pine Green plus a Selected Row Ice fill** — never by a border or heavy highlight. Trailing
  actions are outline glyphs only (run ▶, history ↺), holding their colour back until hover.

* **Progress / Execution Bar:** A single fully-rounded track segmented proportionally across the five
  status colours, paired with an inline legend of dot + label + tabular count. It is the product's
  signature object — the whole build's health as one horizontal glance.

* **Modals / Confirmation dialogs:** A card at Level 3 elevation on a scrim, `rounded-3xl` (§5's `xl`),
  holding a title, a sentence of consequence and two answers. Width `--container-modal` (`max-w-modal`,
  28rem) with a `space-md` gutter either side on a narrow screen, so it never touches the edge. The scrim is
  the foreground navy at 40% (`bg-foreground/40`) — the canvas dimmed rather than a new colour, because a
  scrim that announced itself would be decoration. The destructive answer takes the primary button, because
  in a confirmation the committing action *is* the destructive one; the safe answer is secondary and is what
  keyboard focus lands on.

* **Timeline (Attempt History):** A vertical hairline connector threading filled circular medallions —
  emerald with a white check for passed, crimson with a white cross for failed. Each entry leads with a
  status-coloured bold title (`Attempt #3 · Passed`), a right-aligned relative timestamp in slate, then
  body copy with inline monospace references. Attachments sit in a Whisper Periwinkle rounded row with a
  leading icon, monospace filename and right-aligned size.

* **Sidebar Navigation:** Pure white against the porcelain canvas. Uppercase Label sm eyebrows section the
  list. The active item takes a **Pale Mint Wash pill with a Deep Pine Green leading edge, matching text
  and icon, and a trailing emerald dot**; inactive items are navy text with outline icons. Trailing
  counts sit flush right — plain slate when neutral, a rose pill when they demand attention.

## 5. Layout Principles

An **8px rhythm** across an adaptive 12-column grid, anchored by a persistent left sidebar and an
optional right context rail — a three-zone frame of *navigate · work · inspect* that holds across the app.

* **Desktop (1200px+):** 12 columns, `1.5rem` (24px) gutters, `2rem` (32px) outer margins, max width
  `1440px`. The primary work surface takes roughly two-thirds, the context rail one-third.
* **Tablet (768–1199px):** 8 columns, `1.5rem` gutters; the sidebar collapses to a slide-over and the
  context rail drops beneath the main content.
* **Mobile (<767px):** 4 columns, `1rem` gutters and outer margins; dense tables become vertical card
  stacks, one case per card.

**Whitespace strategy:** air between components, economy within them. Cards are separated by a full
`1.5rem`–`2rem` so each reads as a discrete object, while interiors tighten to `0.75rem` in table cells
and utility bars. Nothing is crowded and nothing floats unanchored.

**Spacing scale:** `space-2xs` 0.25rem · `space-xs` 0.5rem · `space-sm` 0.75rem · `space-md` 1rem ·
`space-lg` 1.5rem · `space-xl` 2rem · `space-2xl` 3rem.

**Corner radius scale:** `sm` 0.25rem (4px) · `DEFAULT` 0.5rem (8px, inputs and buttons) · `md` 0.75rem
(12px, data cards) · `lg` 1rem (16px, panels) · `xl` 1.5rem (24px, modals and drawers) · `full` 9999px
(status chips and badges only).

> **How this scale is named in code.** The radius names above are the design system's own; the
> Tailwind utility names differ, because shadcn/ui's components pick their own. The tokens in
> `app/globals.css` map one to the other by *what the element is*, not by matching names:
>
> | This document | Tailwind utility | Used by |
> | --- | --- | --- |
> | `DEFAULT` 0.5rem | `rounded-md`, `rounded-lg` | Inputs, buttons |
> | `md` 0.75rem | `rounded-xl` | Data cards |
> | `lg` 1rem | `rounded-2xl` | Panels |
> | `xl` 1.5rem | `rounded-3xl` | Modals, drawers |
> | `full` | `rounded-full` | Status chips and badges only |
>
> So `rounded-lg` is 8px, not 16px. Read the table, not the name.
>
> **On the 8px rhythm and Tailwind's numeric steps.** The named scale above is what layout uses:
> `gap-lg`, `px-md`, `py-xl`. Tailwind's own numeric steps — `mt-1.5`, `pl-3.5`, `size-3.5`, `h-11`
> — are allowed *inside* a control, where the rhythm is set by the control's own proportions rather
> than by the grid: the 44px field height, the 6px gap between a label and its field, the 14px icon
> beside a line of 14px text. They are on Tailwind's scale, not arbitrary bracket values, and
> `h-[44px]` remains forbidden. If a value wants to be reused across components, it wants a token.
>
> The §5 spacing scale is exposed as `gap-md`, `px-lg`, `py-xl` and so on, matching the names above.
> Because those share Tailwind's t-shirt names they also shadow its container scale, so `max-w-md`
> is `1rem` here rather than the 28rem Tailwind would give you. Widths take a `--container-*` token
> (`max-w-auth-card`) or a numeric step.
>
> The §3 type scale is exposed with names that do match: `text-display`, `text-headline-lg`,
> `text-headline-md`, `text-headline-sm`, `text-title-lg`, `text-body-lg`, `text-body-md`,
> `text-body-sm`, `text-label-md`, `text-label-sm`. Each carries its own line height, tracking and
> weight, so picking a step gives all four. Never reach for `text-[40px]`: it silently drops the
> tracking that makes large type in this system cohere.

> **In code.** Two of §5's own numbers are tokens, for the reason the radius table gives: a value
> reused across components wants a name. `--container-sidebar` (`w-sidebar`, 16rem) is the sidebar's
> width, which every later phase's pages sit beside, and `--breakpoint-desktop` (`desktop:`, 1200px)
> is the threshold above which the three-zone frame applies — Tailwind's own `lg` and `xl` straddle
> the 1200px line this section names, so neither is the breakpoint the design means.

**Alignment:** everything left-aligns to a shared grid; only numeric values, timestamps, counts and
trailing actions align right, so the eye can run down a column of figures uninterrupted.

**Elevation:** the canvas is flat. Cards take Level 1 (hairline border plus whisper-soft ambient navy
shadow); menus and hover states Level 2; modals and command palettes Level 3. Focus states use a dual
ring — a white inner separator and a saturated outer ring — so keyboard position stays obvious on both
white and porcelain surfaces.
