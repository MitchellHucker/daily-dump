# Daily Dump — Dev Environment Setup

## Prerequisites

These are one-time installs. If you're setting up on a new machine, do these first.

### 1. Node.js
Download and install the **LTS version** from [nodejs.org](https://nodejs.org).

During installation on Windows, make sure "Add to PATH" is checked.

Verify it worked by opening a terminal and running:
```
node --version
npm --version
npx --version
```
All three should print version numbers. If `npm` or `npx` fail on Windows with a security error, run this once in PowerShell:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### 2. Git
- **Mac:** Git is usually pre-installed. Run `git --version` to check.
- **Windows:** Download from [git-scm.com](https://git-scm.com) if not already installed.

After installing, set your identity (use the email you signed up to GitHub with):
```
git config --global user.email "you@youremail.com"
git config --global user.name "Your Name"
```

### 3. Cursor (code editor)
Download from [cursor.com](https://cursor.com). This is the primary editor for this project — a VS Code fork with AI assistance built in.

---

## Getting the project

### Clone the repository
```
git clone https://github.com/MitchellHucker/daily-dump.git
cd daily-dump
```

This downloads the full project from GitHub onto your machine.

### Install dependencies
```
npm install
```

This reads `package.json` and downloads all the libraries the project depends on into a `node_modules` folder. This folder is not stored in Git (it's in `.gitignore`) — you need to run this on every fresh clone.

---

## Running locally

```
npm run dev
```

Opens the app at [http://localhost:3000](http://localhost:3000). The server stays running and hot-reloads whenever you save a file. Stop it with **Ctrl+C**.

---

## Environment variables

Some features require API keys that are never stored in Git. Create a file called `.env.local` at the project root (same level as `package.json`) and add the relevant keys:

```
# Required for feedback extraction (Phase 1 - moves server-side in Phase 3)
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_key_here

# Required for real brief generation
ANTHROPIC_API_KEY=sk-ant-...
TAVILY_API_KEY=tvly-...
```

Get your Anthropic API key from [console.anthropic.com](https://console.anthropic.com) → API Keys.
Get your Tavily API key from [tavily.com](https://tavily.com). Tavily is used for article retrieval before Anthropic synthesises the brief.

**Important:** `.env.local` is listed in `.gitignore` and must never be committed to GitHub. Each developer maintains their own copy locally.

---

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local development server at localhost:3000 |
| `npm run build` | Build the production version — catches TypeScript errors the dev server misses |
| `npm run lint` | Check code for style and error issues |

---

## Deploying

Deployment is automatic. Every push to the `main` branch on GitHub triggers a Vercel redeploy within ~30 seconds.

Live URL: [daily-dump.vercel.app](https://daily-dump.vercel.app)

Vercel dashboard: [vercel.com](https://vercel.com) — log in with GitHub.

To add environment variables to the live deployment: Vercel dashboard → daily-dump project → Settings → Environment Variables.

---

## Project structure

```
morning-dump/               ← Project root (folder name is legacy, app is Daily Dump)
  src/
    app/                    ← Next.js pages and routing
      page.tsx              ← Main app shell
      layout.tsx            ← Root layout, fonts, metadata
      globals.css           ← Global styles and CSS tokens
    components/             ← React UI components
      ProfileBar.tsx        ← Profile selector (Mitchell, Ralitsa, Preview)
      StoryCard.tsx         ← Individual story with expand/collapse
      BriefView.tsx         ← Full brief renderer
      NudgeCard.tsx         ← Smart nudge prompt
      FeedbackPanel.tsx     ← Post-brief feedback input
    lib/                    ← Shared logic and utilities
      profiles.ts           ← Profile configs and prompt templates
      stubs.ts              ← Hardcoded stub brief for testing
      parser.ts             ← Plain-text brief format parser
      interactions.ts       ← Interaction tracking hook
  phase-1-scope.md          ← Phase 1 build brief (reference)
  .env.local                ← API keys — create this manually, never commit
  package.json              ← Project dependencies and scripts
```

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| AI API | Anthropic (claude-sonnet) |
| Deployment | Vercel |
| Version control | GitHub |

Auth and database (Clerk + Supabase) are added in Phase 2 — not yet configured.