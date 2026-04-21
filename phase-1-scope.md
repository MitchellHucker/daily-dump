# Daily Dump — Phase 1 Scope

## What we are building

A Next.js frontend for Daily Dump — a personalised AI news briefing app. Phase 1 is **frontend only**. No authentication, no database, no real API calls. All brief content comes from hardcoded stub data. The goal is a properly structured, deployed Next.js app that looks and behaves exactly like the POC.

## Reference: the POC

The working proof-of-concept is at:
```
C:\Users\mhuck\Documents\Work\Daily Dump App\Design Files - Claude\morning-dump-v5.jsx
```

This is a single-file React component containing all the logic, styling, and stub data. Phase 1 is a straight port of this into a proper Next.js project structure — split into separate component files, using Tailwind for styling instead of the inline CSS string.

**Do not change the behaviour or design** — port it faithfully. We are not adding features, we are restructuring.

## Naming

The app is called **Daily Dump**. All references should use `daily-dump` or `DailyDump`. The folder is called `morning-dump` for now (the Next.js project was scaffolded with that name) — do not rename the folder, but all component names, copy, and internal references should say Daily Dump.

## Project structure to create

```
src/
  app/
    page.tsx              ← Main page, renders the full app shell
    layout.tsx            ← Already exists, update metadata (title: Daily Dump)
    globals.css           ← Keep minimal, Tailwind handles styling
  components/
    ProfileBar.tsx        ← Profile selector buttons (Mitchell, Ralitsa, Preview)
    StoryCard.tsx         ← Individual story with expand/collapse, entity tags, follow button
    BriefView.tsx         ← Renders a full brief: sections + story cards
    NudgeCard.tsx         ← Smart nudge prompt when user engages repeatedly with a topic
    FeedbackPanel.tsx     ← Post-brief written feedback input + AI extraction display
  lib/
    stubs.ts              ← Hardcoded STUB_BRIEF data (ported from POC)
    parser.ts             ← parseBrief() text format parser (ported from POC)
    profiles.ts           ← PROFILES config — Mitchell, Ralitsa, Preview (stub) definitions
    interactions.ts       ← useInteractionTracker hook (ported from POC)
```

## What each component does

**ProfileBar** — sticky bar showing three profile buttons: Mitchell Hucker, Ralitsa Tabakova, and Preview Mode. Selecting a profile sets the active profile state. Mitchell gets an amber accent, Ralitsa gets blue, Preview gets green. Matching the POC styling.

**StoryCard** — a single news story. Default (collapsed) view shows headline + snap (one sentence). Expanded view shows entity tags, detail text, personalised take, source with follow button. The `+` icon rotates to `×` when open. Clicking an entity tag tracks it.

**BriefView** — renders a full parsed brief. Maps over sections, renders section labels, renders a StoryCard for each story. Receives the brief object and accent colour as props.

**NudgeCard** — appears when a user has expanded stories about the same entity 3+ times. Asks if they want more coverage on that topic. Has Yes / Customise / No options. Customise opens a textarea for specific instructions.

**FeedbackPanel** — shown below the brief (not for Preview/stub profile). Free text input. On submit, calls the Anthropic API to extract structured signals (liked, add_topics, more_depth_on, remove_or_reduce, summary) and displays them as coloured pill tags. This API call goes directly from the frontend for now — it moves server-side in Phase 3.

**parser.ts** — pure function, no dependencies. Takes the raw line-prefixed text format and returns `{ sections: [...] }`. Port exactly from POC — do not rewrite the logic.

**profiles.ts** — exports the PROFILES object with Mitchell, Ralitsa, and Preview (stub) configs. Each profile has: id, name, initials, role, accent colour, sections list, prompt function, and isStub flag.

**stubs.ts** — exports STUB_BRIEF, the hardcoded brief object used by the Preview profile. Port directly from POC.

**interactions.ts** — exports the `useInteractionTracker` hook. Tracks expand and follow events per entity key. Returns `track`, `getNudge`, and `dismissNudge`.

## Styling approach

Use **Tailwind CSS** for all styling. The POC uses an inline CSS string — extract the design tokens (colours, fonts, spacing) and implement equivalent Tailwind classes. 

Fonts: Syne (headings), DM Mono (labels/mono), DM Sans (body) — load via `next/font/google`.

Key design tokens to preserve:
- Background: `#f5f2ed`
- Ink: `#111`
- Amber accent (Mitchell): `#c8860a`
- Blue accent (Ralitsa): `#2a7fa8`
- Green accent (Preview): `#5a7a5a`
- Card background: `#ffffff`
- Border: `#e8e4dc`

## Page behaviour (page.tsx)

The main page manages top-level state:
- `activeProfile` — which profile is selected
- `status` — idle | loading | done | error
- `brief` — the parsed brief object

When Mitchell or Ralitsa click Generate:
- Status goes to "loading" for a short delay
- For now, resolve with STUB_BRIEF (same as Preview) — real API call comes in Phase 3
- Status goes to "done", brief renders

When Preview is selected and Generate is clicked:
- Instantly (400ms delay) resolves with STUB_BRIEF
- Shows STUB badge on brief header

## What Phase 1 explicitly does NOT include

- No Anthropic API call for brief generation (stubs only for all profiles in Phase 1)
- No authentication or login
- No Supabase or any database
- No user settings persistence
- No server-side routes

The FeedbackPanel's extraction call (to Anthropic) is the **one exception** — it can remain a direct frontend call as it is in the POC, since it is low-risk (feedback only, not generation). This moves server-side in Phase 3.

## Definition of done

- [ ] App loads at localhost:3000 with Daily Dump header
- [ ] Both profile buttons (Mitchell, Ralitsa) and Preview stub button render in the profile bar
- [ ] Selecting a profile shows the "Generate" screen with their name
- [ ] Clicking Generate shows loading state then renders the stub brief
- [ ] Stories collapse/expand correctly
- [ ] Entity tags appear on expand, can be clicked to track
- [ ] Follow button appears next to source on expand
- [ ] Nudge card appears after repeated engagement with same entity
- [ ] Feedback panel appears below brief (not on Preview profile)
- [ ] Feedback submission extracts and displays signal pills
- [ ] Preview profile shows STUB badge, no feedback panel
- [ ] App is pushed to GitHub and auto-deploys to daily-dump.vercel.app
- [ ] Layout is readable on mobile (375px width minimum)