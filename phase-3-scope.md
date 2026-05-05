# Daily Dump — Phase 3 Scope

## What we are building

Authentication and persistence for Daily Dump. Users can create accounts, log in, and have their generated briefs and topic preferences stored. The app moves from a hardcoded two-profile tool into a real multi-user product.

Phase 3 is **auth and persistence only**. The brief generation logic from Phase 2 is unchanged. The onboarding flow replaces the hardcoded profiles for new users, but Mitchell and Ralitsa's profiles remain available behind the dev mode flag during this phase.

---

## Reference

- Phase 2 codebase: server-side generation via `/api/generate`, streaming via SSE, two hardcoded profiles
- Wireframes: agreed flow covering sign up, onboarding, brief page states, and dev mode (see conversation history)
- The nudge feature has been explicitly deferred to Phase 4 — do not build it in this phase

---

## Services to set up

### Clerk

Handles all authentication — login, signup, session management, Google OAuth. Do not build custom auth.

```
npm install @clerk/nextjs
```

Environment variables needed:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/brief
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### Supabase

Postgres database for storing users, profiles, and briefs. Create a new project in the **eu-west-2 (London)** region.

```
npm install @supabase/supabase-js
```

Environment variables needed:

```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The service role key is server-side only — never use it in frontend code or prefix with `NEXT_PUBLIC_`.

---

## Database schema

Create these tables in Supabase via the SQL editor:

```sql
-- Users (synced from Clerk on first sign-in)
create table users (
  id text primary key, -- Clerk user ID
  email text not null,
  name text,
  dev_mode boolean default false,
  created_at timestamptz default now()
);

-- User topic/lens preferences
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  topics jsonb not null default '[]',
  updated_at timestamptz default now()
);

-- Generated briefs (one per user per day)
create table briefs (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  content jsonb not null,
  generated_at timestamptz default now(),
  date text not null -- YYYY-MM-DD format, used for daily cache lookup
);
```

---

## Build increments

Build and verify each increment before starting the next. Each ends with a commit.

---

### Increment 1 — Clerk auth

**Goal:** users can sign up, sign in, and sign out. The brief route is protected. Nothing else changes.

**Tasks:**

- Install Clerk and add environment variables to `.env.local` and Vercel
- Add `ClerkProvider` to `src/app/layout.tsx`
- Create `src/middleware.ts` to protect `/brief` and `/onboarding` routes — unauthenticated users redirect to `/sign-in`
- Create `src/app/sign-in/page.tsx` using Clerk's `<SignIn />` component
- Create `src/app/sign-up/page.tsx` using Clerk's `<SignUp />` component
- Create `src/app/page.tsx` as the landing page — minimal, logo, tagline, "Get started" CTA linking to `/sign-up`, "Sign in" link to `/sign-in`
- Add a sign-out button to the brief page header (Clerk's `<UserButton />` component handles this)
- The brief page still uses hardcoded profiles and stubs at this point — generation is unchanged

**Verify:** sign up with a new account, see the brief page, sign out, confirm redirect to landing page, sign in again.

**Commit:** `"Phase 3.0.1 - Clerk auth, protected routes, landing page"`

---

### Increment 2 — Supabase connection and user sync

**Goal:** when a user signs in, their record is created in Supabase. Verify via the Supabase dashboard.

**Tasks:**

- Create Supabase project (eu-west-2), add environment variables to `.env.local` and Vercel
- Create all three tables (`users`, `profiles`, `briefs`) using the SQL schema above
- Create `src/lib/supabase.ts` — exports a server-side Supabase client using the service role key
- Create a Clerk webhook or use Next.js middleware to sync the Clerk user to the `users` table on first sign-in. Store: Clerk user ID, email, name, `dev_mode: false`
- Do not build any UI in this increment — it is backend only

**Verify:** sign in, open Supabase dashboard, confirm a row exists in the `users` table with your Clerk user ID.

**Commit:** `"Phase 3.0.2 - Supabase connected, user sync on sign-in"`

---

### Increment 3 — Brief caching

**Goal:** generated briefs are stored in Supabase. On page load, today's brief is served from cache if it exists. The generate button is disabled after generation and shows a midnight reset countdown.

**Tasks:**

- Update `/api/generate/route.ts` to write the completed brief to the `briefs` table after generation, storing: `user_id`, `content` (the parsed brief JSON), `generated_at`, and `date` (today's date as YYYY-MM-DD in the user's timezone)
- On the brief page, on mount: fetch today's brief from Supabase for the current user. If found, render it directly without showing the generate button as active
- Generate button states:
  - Active: "Generate today's brief →" (no brief exists for today)
  - Disabled: "Already generated today" with a countdown to midnight (brief exists for today)
- Yesterday's brief: after fetching today's brief, also fetch the most recent prior brief for the user and store it in component state. Render it below today's brief using the same `BriefView` and `StoryCard` components — fully interactive, not read-only. Label it clearly as "Yesterday's brief" with muted styling.
- The yesterday's brief is client state only — lost on page reload. This is intentional.
- Midnight reset: base the daily cache check on the calendar date (YYYY-MM-DD) in UTC, not a 24-hour rolling window. A brief generated at 23:00 should allow a new generation at 00:01 the next day.

**Dev mode exception:** if `dev_mode` is true on the user record, show a "Force regenerate" button that bypasses the cache check and generates a fresh brief regardless of whether one exists today.

**Verify:** generate a brief, confirm it appears in the Supabase `briefs` table. Reload the page, confirm the brief loads from cache without hitting generate. Confirm the generate button is disabled with the countdown.

**Commit:** `"Phase 3.0.3 - Brief caching, yesterday's brief, midnight reset"`

---

### Increment 4 — Onboarding flow

**Goal:** new users who have no profile in Supabase are redirected to onboarding. They select topics, refine with interests and a lens, and their preferences are stored. Generation uses their stored profile rather than hardcoded profiles.

**Tasks:**

**Onboarding pages (`src/app/onboarding/`):**

- Step 1 — Topic selection: grid of 16 single-word topics. Max 3 selectable (free tier). Topics: Technology, Politics, Finance, Science, Law, Geopolitics, Environment, Education, Business, Health, Sport, Defence, Energy, Media, Property, Space. "Skip setup, just start" ghost button bypasses steps 2 and 3 and saves default preferences.
- Step 2 — Topic refinement (repeats for each selected topic): shows topic name, interest chips (predefined per topic), and a free-text "Tell us more" lens textarea. "Skip, use defaults →" ghost button moves to the next topic without saving lens. Counter label ("Refining topic 1 of 3") with matching dots shows progress accurately.
- Step 3 — Confirmation screen: summary of selected topics and interests. "Generate my brief →" CTA.

**Routing logic:**

- After sign-up, Clerk redirects to `/onboarding`
- After sign-in, middleware checks if the user has a `profiles` row in Supabase. If not, redirect to `/onboarding`. If yes, redirect to `/brief`.
- After completing onboarding, save preferences to `profiles` table and redirect to `/brief`

**Generation changes:**

- Update `/api/generate/route.ts` to accept user ID, fetch their stored profile from Supabase, and build the prompt dynamically from their topics, interests, and lenses
- The prompt builder in `src/lib/anthropic.ts` should accept a profile object and construct the appropriate prompt — not hardcoded per user

**Predefined interests per topic (use these exactly):**

```
Technology: AI, Startups, LegalTech, FinTech, Hardware, Cybersecurity, Crypto, Space Tech
Politics: UK Politics, US Politics, EU Politics, Elections, Policy, Regulation
Finance: Markets, Investing, Venture Capital, Crypto, Banking, Personal Finance
Science: Climate, Health, Physics, Biology, Space, Research
Law: Regulation, LegalTech, Compliance, International Law, Corporate Law
Geopolitics: International Relations, Trade, Conflict, Diplomacy, Sanctions
Environment: Climate, Energy Transition, Conservation, Policy
Education: Higher Education, EdTech, Policy, Skills
Business: Strategy, M&A, Startups, Leadership, Operations
Health: Public Health, MedTech, Mental Health, Policy, Research
Sport: Football, Rugby, Tennis, Cricket, Olympics
Defence: Military, NATO, Intelligence, Cybersecurity, Procurement
Energy: Oil & Gas, Renewables, Nuclear, Supply Chain, Policy
Media: Publishing, Broadcasting, Social Media, Advertising
Property: Residential, Commercial, REITs, Planning, Mortgages
Space: Exploration, Satellites, Launch, Policy, Commercial
Hobbies: Gaming, Sport, Music, Film & TV, Books, Food & Drink, Travel, Fitness, Cars
```

**Verify:** create a fresh account, go through onboarding, confirm preferences saved to `profiles` table in Supabase, confirm generated brief reflects the selected topics and lens.

**Commit:** `"Phase 3.0.4 - Onboarding flow, dynamic profile generation"`

---

### Increment 5 — Dev mode

**Goal:** Mitchell's account has `dev_mode: true` in Supabase. When active, the brief page shows the profile switcher (Mitchell, Ralitsa, Preview), the force regenerate button, and the dev mode badge.

**Tasks:**

- Set `dev_mode = true` on your user record directly in the Supabase dashboard — no UI needed for this
- In the brief page, fetch the current user's `dev_mode` flag from Supabase on mount
- If `dev_mode` is true:
  - Show a small "Dev mode" badge in the header
  - Show the three hardcoded profile buttons (Mitchell, Ralitsa, Preview) — these work exactly as before
  - Show a "Force regenerate" button that bypasses the daily cache and calls `/api/generate` fresh
  - The force regenerate does not overwrite the cached brief — it generates and displays without storing, so the normal cached brief is preserved
- If `dev_mode` is false (all other users): none of the above is visible

**Verify:** confirm dev mode UI appears for your account, confirm it does not appear when signed in as a different test account.

**Commit:** `"Phase 3.0.5 - Dev mode flag, profile switcher, force regenerate"`

---

## What does not change in Phase 3

- Brief output format and parser — untouched
- Streaming status updates — untouched
- StoryCard, BriefView, NudgeCard (though nudge is not used), FeedbackPanel components — untouched
- Error handling — same error states as Phase 2
- The nudge feature — explicitly deferred to Phase 4

---

## Parking lot (Phase 4)

- Persist interaction signals (expands, follows) to Supabase — enables the nudge feature
- Persist feedback panel submissions to Supabase — enables brief refinement over time
- Inject stored signals and feedback into next generation prompt
- Nudge feature — revisit once signal persistence exists and usage data informs whether it adds value

---

## Definition of done

- Landing page live at daily-dump.vercel.app — sign in / sign up CTAs
- New users can sign up and are redirected to onboarding
- Returning users are redirected directly to their brief
- Unauthenticated users cannot access `/brief` or `/onboarding`
- User record created in Supabase on first sign-in
- Topics, interests, and lens saved to `profiles` table after onboarding
- Generated brief is stored in `briefs` table
- Brief loads from cache on return visit — generate button disabled with midnight countdown
- Yesterday's brief appears below today's, fully interactive
- Dynamic prompt built from user's stored profile — not hardcoded
- Dev mode UI visible for Mitchell's account only
- Force regenerate works in dev mode
- All environment variables added to Vercel
- All five increments committed and pushed to GitHub
- Both Mitchell and Ralitsa have created real accounts and gone through onboarding

---

## Planned iterations (post Phase 3 core)

These are confirmed directions but deliberately excluded from Phase 3 to keep the core build focused. Build Phase 3 completely before starting these.

---

### Phase 3.1 — Free-text personalisation onboarding

**What:** Replace the topic grid onboarding with a single free-text prompt. The user describes themselves — who they are, what they do, their interests — and a lightweight AI model extracts topic selections, interest chips, and a lens draft automatically. The user then reviews and edits rather than building from scratch.

**Why:** The multi-step topic grid is slow to value. A single text box gets to a personalised first brief faster and collects richer context than checkbox selections can.

**Flow:**

1. After sign-up, user lands on a single screen: "Tell us about yourself — your job, interests, what you want to stay on top of"
2. Free text box, no character limit
3. Submit → Haiku (lightweight model, cheap) extracts: suggested topics, interest chips per topic, and a draft lens for each topic
4. User sees a review screen — the auto-selected topics and lenses pre-filled, fully editable
5. Confirm → saved to Supabase profiles table (see schema below)
6. "I'd rather choose myself" fallback link → drops to the manual topic grid from Phase 3

**Model:** Use `claude-haiku-4-5` for the extraction call — this is a simple classification and summarisation task, not synthesis. Significantly cheaper than Sonnet.

**Fallback handling:** If the user's description is too vague to extract meaningful topics, the review screen shows sensible defaults (Technology, Geopolitics, Markets) with a prompt to adjust. Do not fail silently.

---

**Data model**

Add an `overview` column to the `profiles` table:

```sql
alter table profiles add column overview text;
```

The full stored profile shape:

```json
{
  "overview": "I'm a PM in the UK working with AI in a startup focused on visually modeling entities and relationships.",
  "topics": [
    {
      "id": "tech",
      "label": "Technology",
      "interests": ["LegalTech", "AI"],
      "lens": "I work in a startup focused on visually modeling entities and relationships..."
    },
    {
      "id": "geo",
      "label": "Geopolitics",
      "interests": ["International Relations"],
      "lens": "Interested in how global events affect UK tech policy..."
    }
  ]
}
```

The `overview` field stores the user's raw self-description exactly as typed. It is not processed or summarised — it is stored verbatim.

**Why store the overview separately from the extracted topics:**

- It provides cross-section user context that colours every story, not just one topic
- It is the raw material for future refinement — if interests change, re-run extraction against the updated overview rather than reverse-engineering from stored topics
- It can be shown back to the user in a settings/profile screen so they can edit their self-description directly

**How the overview is used in generation:**

Prepend to every generation prompt as a user-level context block, before per-section topic instructions:

```
User context: I'm a PM in the UK working with AI in a startup focused on visually modeling entities and relationships.

[per-section topic/lens instructions follow]
```

This gives the model context that applies across all sections — not just the specific topic lenses.

**Haiku extraction prompt:**

The extraction call should return structured JSON containing the overview (verbatim), suggested topics, interests per topic, and a draft lens per topic. Cursor should define the tool schema for this extraction call similar to how `deliver_brief` is defined — forced structured output, not free text.

---

**What does not change:** All Phase 3 auth infrastructure, the `briefs` table, the generation route, and Clerk integration remain identical. The only schema change is adding the `overview` column to `profiles`. The `topics` jsonb column structure is unchanged.

---

### Phase 3.2 — Landing page value proposition

**What:** Add a value proposition to the landing screen above the sign-up form. Currently the landing page is too bare for a cold visitor — it has the logo and two buttons but no reason to care.

**Direction:** Lead with the morning ritual angle — the brief as something you look forward to, not a chore. Tone: confident, slightly playful, not corporate. The app name "Daily Dump" gives permission to be irreverent.

**Copy to workshop:** "Whether you start your day with a coffee or in the bathroom, look forward to waking up." — rough direction, refine before shipping.

**Constraints:**

- Mobile-first — must read well at 390px
- One or two lines maximum — this is not a hero section with bullet points
- Must sit above the sign-up form without pushing it below the fold on mobile
- Consistent with the E1 design system (Syne, Plus Jakarta Sans, amber accent)

**What does not change:** Auth flow, Clerk integration, routing — all Phase 3 core.

---

### Phase 3.3 — General news loading state (shared cache)

**What:** While a user's personalised brief is generating (~20-30 seconds), show 3-4 general world news articles they can read immediately. These are not personalised — they are the same for every user on a given day.

**Architecture:**

- A `general_news` table in Supabase stores today's general articles with a `date` column (YYYY-MM-DD)
- On page load: check if `general_news` has a fresh entry for today. If yes, show immediately. If no, fetch when the first generation of the day is triggered.
- **First user to generate today:** triggers two parallel calls — their personalised Tavily + Anthropic brief as normal, AND a general news Tavily fetch (3-4 results, `query: "top world news today"`, `topic: "news"`, no Anthropic synthesis). General articles written to Supabase. General articles appear on screen as soon as Tavily returns (~2 seconds), before the personalised brief completes.
- **Every subsequent user that day:** general articles served instantly from Supabase — zero additional Tavily or Anthropic cost.

**Display:**

- General articles appear above the generate button while the personalised brief is loading
- Labelled clearly: "While you wait — today's headlines" or similar
- Shown as collapsed story rows (headline + snap only) — same StoryCard component, no expand needed for this phase
- Once the personalised brief arrives, it slides in above the general articles
- Yesterday's personalised brief remains below as before

**Cost profile:**

- One extra Tavily call per day total (not per user) — ~2 credits
- No extra Anthropic call — general articles are shown as raw Tavily snippets, not synthesised
- After the first user of the day, zero marginal cost per subsequent user

**Upgrade path (Phase 4+):** Move the general news fetch from "triggered by first user generation" to a daily cron job at 6am. Same Supabase table, same frontend logic, different trigger. One infrastructure change when the time comes.

**Supabase table to add:**

```sql
create table general_news (
  id uuid primary key default gen_random_uuid(),
  date text not null unique,  -- YYYY-MM-DD, one row per day
  articles jsonb not null,    -- array of { title, url, content, published_date }
  created_at timestamptz default now()
);
```

**What does not change:** personalised generation flow, profiles, briefs table, auth — all untouched. This is additive only.