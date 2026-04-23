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

**Commit:** `"Phase 3.1 - Clerk auth, protected routes, landing page"`

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

**Commit:** `"Phase 3.2 - Supabase connected, user sync on sign-in"`

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

**Commit:** `"Phase 3.3 - Brief caching, yesterday's brief, midnight reset"`

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
```

**Verify:** create a fresh account, go through onboarding, confirm preferences saved to `profiles` table in Supabase, confirm generated brief reflects the selected topics and lens.

**Commit:** `"Phase 3.4 - Onboarding flow, dynamic profile generation"`

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

**Commit:** `"Phase 3.5 - Dev mode flag, profile switcher, force regenerate"`

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

- [ ] Landing page live at daily-dump.vercel.app — sign in / sign up CTAs
- [ ] New users can sign up and are redirected to onboarding
- [ ] Returning users are redirected directly to their brief
- [ ] Unauthenticated users cannot access `/brief` or `/onboarding`
- [ ] User record created in Supabase on first sign-in
- [ ] Topics, interests, and lens saved to `profiles` table after onboarding
- [ ] Generated brief is stored in `briefs` table
- [ ] Brief loads from cache on return visit — generate button disabled with midnight countdown
- [ ] Yesterday's brief appears below today's, fully interactive
- [ ] Dynamic prompt built from user's stored profile — not hardcoded
- [ ] Dev mode UI visible for Mitchell's account only
- [ ] Force regenerate works in dev mode
- [ ] All environment variables added to Vercel
- [ ] All five increments committed and pushed to GitHub
- [ ] Both Mitchell and Ralitsa have created real accounts and gone through onboarding