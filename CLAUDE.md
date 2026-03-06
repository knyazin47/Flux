# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `frontend/` directory:

```bash
cd frontend
npm install        # install dependencies
npm run dev        # start dev server (Vite, http://localhost:5173)
npm run build      # production build
npm run lint       # ESLint (quiet mode)
npm run lint:fix   # ESLint with auto-fix
npm run typecheck  # TypeScript type-check (no emit)
npm run preview    # preview production build locally
```

No test suite is configured.

### Environment setup

Create `frontend/.env.local` (see `frontend/.env.example` for all variables):
```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app
```

### Vercel serverless (api/generate.js)

`POST /api/generate` generates questions on-demand via Claude Haiku. Requires `ANTHROPIC_API_KEY` set in the Vercel project environment (not in `.env.local`). Accepts `{ topic, count, difficulty, formulaContext }` in the request body.

### Daily questions generation (CI)

GitHub Action runs daily at 09:00 Minsk time. Can be triggered manually via `workflow_dispatch`. The script uses the `claude` CLI (OAuth auth via secrets) to generate questions and commits `frontend/public/daily-questions.json`.

To run locally:
```bash
node scripts/generate-daily.js
```

## Development Guidelines

### Branding & Identity (Flux)
- **Project Name:** Always use **"Flux"**. Never use "Lovable", "BASE44", or "Physics" as the standalone app name.
- **Terminology:**
  - Main topic header: **"Физика"** (no emojis like ⚛️)
  - Achievements header: **"Достижения"** (no trophy 🏆 icon)
  - Top Level Rank: **"Эпштейн"** (ensure correct spelling)
- **UI Cleanliness:** Labels like "← Не знаю | Знаю →" are forbidden. Interface must remain minimalist.

### Versioning Protocol (SemVer)
Maintain the version in **both** `frontend/package.json` and `frontend/src/version.js` (`APP_VERSION` export) — they must always match.
- **Patch (0.0.x):** Bug fixes, style tweaks, minor text edits.
- **Minor (0.x.0):** New features, logic changes, new content modules.
- **Major (x.0.0):** Breaking changes, rebranding, or complete architecture overhauls.
- **Commit Format:** Every commit must start with the version, e.g., `v1.2.3: description`.

### UX Logic: Active Recall
- **FormulaCards:** When moving to the next card, reset state to `isFlipped: false`. The user must always perform a manual "Reveal" action.

### Code & Repository Hygiene
- **Zero Branding Leak:** Ensure no "lovable-tag" or "base44-id" remains in the DOM or metadata.
- **Documentation:** README.md is for public project presentation only. Move instructional content to `docs/`.

## Architecture

### Repository structure

```
flux/
  frontend/          # React PWA (Vite)
  api/
    generate.js      # Vercel Serverless Function — POST /api/generate (on-demand questions via Claude)
  data/
    formulas.json    # Master formula database (all 9 topics, with LaTeX)
  scripts/
    generate-daily.js  # Node script called by GitHub Action
  formuls/           # Source PDF files (formula sheets, physics summaries)
  docs/              # Architecture, development, contributing guides
  .github/workflows/
    main.yml         # Daily question generation workflow
```

### Frontend architecture

The app is a **mobile-first PWA** (max-width 390px). Routing uses React Router 6 with `src/pages.config.js`. Auth is a no-op stub (`src/lib/AuthContext.jsx`) — the app is fully local with no backend.

**Routing:** `src/pages.config.js` registers all pages and the shared `Layout`. Routes are `/{PageName}` based on the key in the `PAGES` object. `createPageUrl(name)` in `src/utils/index.ts` generates these URLs. The file header claims auto-generation but it is manually maintained. The Onboarding page bypasses the Layout (no nav).

**Layout (`src/Layout.jsx`):** Sticky header (56px) + fixed bottom nav (64px) + scrollable `<main>`. Manages dark/light theme via CSS variables on `:root`/`.dark` and `localStorage("theme")`. Shows a "resume session" Play button in the header when `tasks_session` or `theory_session` exist in localStorage.

**Pages (10 total):**
- `Onboarding` - exam date, daily goal, push permission setup
- `Dashboard` - countdown, streak, XP, daily progress
- `Tasks` - daily question session (5-choice MCQ, timer, explanations)
- `Theory` - topic-based MCQ (theory difficulty)
- `FormulaCards` - SM-2 spaced repetition flash cards
- `Cheatsheet` - formula reference by topic with starred "сложные"
- `MockExam` - full (30q/90min) or mini (10q/30min) exam simulation
- `Progress` - stats, topic heatmap, RT/DRT tracker, achievements
- `SettingsPage` - theme, exam date, notifications, reset
- `ActiveSessions` - view and resume in-progress sessions

**State management:** All state is in `localStorage` only (no backend, no accounts). The utility layer is in `src/utils/storage.js`:
- `lsGet(key, fallback)` / `lsSet(key, value)` - safe localStorage wrappers
- `checkAndUpdateStreak()` - called once on Layout mount
- `addXP(amount)` / `incrementTodayDone(count)` - XP and daily progress
- `updateTopicStats(topic, correct, total)` - topic performance tracking
- `checkAchievements()` / `unlockAchievement(id)` - achievement system

**Key localStorage keys:**
- `theme` - "dark" | "light"
- `streak_days`, `streak_last_date` - streak tracking
- `xp_total`, `today_xp`, `today_done` - XP and daily progress
- `daily_goal` - number of daily questions target
- `topic_stats` - `{ [topic]: { correct, total } }`
- `achievements` - `[{ id, unlockedAt }]`
- `rt_results` - RT/DRT exam history
- `tasks_session`, `theory_session` - in-progress session state (for resume)
- `daily_questions_data`, `daily_questions_date` - cached daily questions

**Daily questions:** Fetched from `/daily-questions.json` (served as static asset), cached in localStorage per day. Structure: `{ date, generated_at, questions: { [topic]: { 1: [...], 2: [...] } } }` where keys 1/2 are difficulty levels. Cache is invalidated if `generated_at` metadata is missing. The fetch/cache logic lives in `src/utils/generateQuestions.js`; `prefetchQuestions()` is called once on Layout mount.

**Formula data:** `data/formulas.json` is the master database. Each formula has `id`, `name`, `formula` (text), `latex`, `units`, `subtopic`, `variables`, `difficulty`, `starred`. Loaded directly into FormulaCards and Cheatsheet pages.

### Design system

CSS variables defined in `Layout.jsx` (not Tailwind config):
- `--accent: #F97316` (orange)
- `--bg`, `--card`, `--text`, `--muted`, `--border` - theme-aware

Tailwind is used for layout/spacing; component colors use `style={{ color: "var(--accent)" }}` pattern. UI primitives are shadcn/ui components in `src/components/ui/`.

### XP and gamification

```
XP rewards: correct answer +10, daily goal +50, mock exam +100, streak 7 days +150
Levels: Физик(0) → Механик(200) → Учёный(500) → Академик(1000) → Эпштейн(2000)
Achievements: first_task, streak_7, answers_100, all_topics, perfect
```
