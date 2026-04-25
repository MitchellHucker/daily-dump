# Daily Dump — Phase 2.3 Scope

## What we are building

A full visual redesign of the Daily Dump frontend, implementing the agreed design system across all existing screens. No new functionality — this is a pure UI update. Every screen gets reskinned to match the locked designs before Phase 3 adds auth and new screens on top.

Doing this now rather than after Phase 3 means every new screen built in Phase 3 can inherit the design system from the start, rather than retrofitting later.

---

## Design reference files

Two HTML reference files are saved in the project. Cursor must reference these before touching any code:

- `daily_dump_screen_01.html` — Screen 01: landing/sign-up screen
- `daily_dump_flow_v2.html` — Screens 02–06b: full app flow

These are the locked, agreed designs. Do not deviate from them without explicit instruction.

---

## Design system tokens

Extract these exactly from the reference files. Define them as CSS custom properties in `src/app/globals.css` and as a Tailwind config extension where applicable.

**Colours:**
```css
--bg: #f7f6f2;          /* warm off-white — main background */
--ink: #141210;         /* near-black — primary text */
--ink-mid: #666;        /* secondary text */
--ink-light: #999;      /* tertiary text, placeholders */
--ink-ghost: #ccc;      /* disabled, labels */
--rule: #e8e5de;        /* dividers, borders */
--amber: #c4712a;       /* accent — CTAs, highlights, logo dot */
--amber-bg: rgba(196,113,42,0.06); /* amber tint for take blocks */
```

**Typography:**
- `Syne` (800, 700) — logo, page titles, expanded story headlines, greeting
- `Plus Jakarta Sans` (600, 500, 400, 300) — story headlines, body text, snap lines, detail
- `Outfit` (600, 500, 400, 300) — section labels, tags, buttons, UI chrome, mono-style labels

Load all three via `next/font/google` in `src/app/layout.tsx`. Apply as CSS variables so components can reference them consistently.

**Spacing and shape:**
- Card border radius: `8px`
- Story row padding: `9–11px` top/bottom, flush to container edges
- Section label: `8–9px`, `0.2em` letter spacing, uppercase, `Outfit` medium
- Rule colour: `#e8e5de` at `1px`

---

## Screens to implement

### Screen 01 — Landing / Sign-up (`src/app/page.tsx`)

Currently shows a minimal placeholder or redirects. Replace with the landing screen from `daily_dump_screen_01.html`:

- Centred layout, full height
- Large `Syne` logo — `Daily.Dump` with amber dot
- Tagline: "Your news, personalised. Every morning." — light weight, muted
- Google OAuth button (styled, not wired — Clerk handles this in Phase 3)
- Email + password inputs
- Primary CTA: "Create account →"
- Sign in link below: "Already have an account? Sign in"
- ToS disclaimer at bottom in ghost text
- No other content — no hero, no marketing copy

### Screen 02 — Topic selection (`src/app/onboarding/topics/page.tsx`)

Stub page for now — wire up properly in Phase 3. Implement the visual design from `daily_dump_flow_v2.html` screen 02:

- Logo header
- Step indicator: "Step 1 of 2 · Topics"
- Title: "What do you care about?"
- Subtitle: "Pick at least 1, up to 3 to start."
- 3-column topic grid — 16 topics, single-word labels
- Selected state: amber border + amber-bg tint
- Dimmed state: 35% opacity (when 3 already selected)
- Selected count line: "X of 3 selected — upgrade for more"
- Next button — active once ≥1 selected, disabled state shown before any selection
- Helper note below button: "Select at least one topic to continue" — fades once selection is made
- No skip button on this screen

Topics (exactly these, single word each):
Technology, Politics, Finance, Science, Law, Geopolitics, Environment, Education, Business, Health, Sport, Defence, Energy, Media, Property, Space

### Screen 03 — Topic refinement (`src/app/onboarding/refine/page.tsx`)

Stub page — wire in Phase 3. Implement design from flow v2, screen 03:

- Logo header
- Step indicator: "Step 2 of 2 · Refine"
- Topic name + counter: "Technology — topic 1 of 3"
- Progress dots — one per selected topic, amber when done
- Interest chips — multi-select, pill-shaped, amber when selected
- "Tell us more" label + textarea for the Lens
- Primary button: "Next topic →"
- Secondary button: "Skip, use defaults →" — ghost style, border, visible but not prominent

### Screen 04 — Ready to generate (`src/app/brief/page.tsx` — pre-generate state)

Already exists in some form. Redesign to match flow v2, screen 04:

- Standard app header (logo left, date + avatar right)
- Greeting: "Morning, [first name]." — Syne, large
- Subtitle: "Your brief is ready to generate." — light weight, muted
- Primary CTA: **"Get today's Dump →"** — "Dump" in amber. This is the confirmed button copy.
- Topics preview card below — muted background, lists confirmed topics with icons and lens summary

### Screen 05 — Brief rendered (`src/app/brief/page.tsx` — done state)

Core screen. Redesign the existing brief view to match flow v2, screen 05:

- Standard header
- Brief meta row: "Mitchell's Brief" left, generation time right — ghost, uppercase, Outfit
- Section labels: icon + label, trailing rule line to edge
- Story rows (collapsed): headline (Plus Jakarta Sans 600) + snap (300, muted), `+` expand icon right
- Story expanded state:
  - Headline upgrades to Syne 700
  - Snap remains, slightly darker
  - Entity tags: small, Outfit, `#eeeae2` background
  - Detail text: Plus Jakarta Sans 300, `#666`
  - Take block: amber left border (2px), amber-bg tint, "Mitchell's Take" label in Outfit uppercase amber, text in Plus Jakarta Sans 300
  - Source row: source name underlined in amber with reduced opacity underline, date appended in ghost ("· 24 April"), Follow button right — ghost border, uppercase Outfit
- The `×` close icon replaces `+` when expanded

### Screen 06a — Returning user, new day (`src/app/brief/page.tsx` — new day, no brief)

State where the user returns but hasn't generated today:

- Greeting + "Fresh day. Yesterday's brief below while you wait."
- Active generate button: "Get today's **Dump** →"
- No reset timer shown
- Yesterday's brief below at 60% opacity, labelled "Yesterday · [date]", fully interactive

### Screen 06b — Already generated today (`src/app/brief/page.tsx` — already generated)

State where today's brief exists:

- Brief meta row showing generation time
- Disabled button: **"Already dumped today"** — muted background, ghost text, not clickable
- Reset timer below button: "Resets at midnight · Xh Xm remaining" — ghost text, small
- Today's full brief rendered and readable below — fully interactive

---

## Component updates

All existing components need restyling. Do not rewrite logic — only update className and styling:

**`ProfileBar.tsx`** — update to use Syne logo, new header layout (logo left, date + avatar right). In dev mode only, profile switcher uses new chip style.

**`StoryCard.tsx`** — full restyle as per screen 05. The expand/collapse logic is unchanged — only the visual treatment changes. Key updates: Syne for expanded headline, amber take block, underlined amber source link with date, ghost follow button.

**`BriefView.tsx`** — update section label treatment (Outfit uppercase, rule line extending to edge).

**`FeedbackPanel.tsx`** — restyle to match the ambient tone. Input border matches `--rule`, submit button uses primary button style.

**`NudgeCard.tsx`** — amber left border (2px), amber-bg tint, consistent with take block styling.

---

## Button copy — confirmed

These are locked. Do not use generic alternatives:

| State | Copy |
|---|---|
| Generate (active) | `Get today's Dump →` — "Dump" in amber |
| Already generated | `Already dumped today` |
| Onboarding next | `Next →` / `Next topic →` |
| Onboarding skip | `Skip, use defaults →` |
| Create account | `Create account →` |

---

## What does not change

- All component logic, state management, and data flow — untouched
- The streaming status messages during generation — untouched
- The parser, profiles, stubs, and API route — untouched
- Brief content and structure — untouched
- Any Phase 2.2 changes — do not regress

---

## Definition of done

- [ ] Design tokens defined in `globals.css` — colours, font variables
- [ ] All three fonts loaded via `next/font/google` in `layout.tsx`
- [ ] Landing screen matches `daily_dump_screen_01.html`
- [ ] Onboarding screens stubbed and styled (topic grid, refinement) — wired in Phase 3
- [ ] Brief page matches screens 04, 05, 06a, 06b from `daily_dump_flow_v2.html`
- [ ] StoryCard expanded state: Syne headline, amber take block, underlined amber source + date
- [ ] Button copy confirmed throughout — "Get today's Dump →", "Already dumped today"
- [ ] `npm run build` passes with no TypeScript errors
- [ ] Tested on mobile viewport (390px) — all tap targets ≥ 44px
- [ ] Pushed to GitHub, live at daily-dump.vercel.app