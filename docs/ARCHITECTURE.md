# Architecture

## Overview

Flux is a **mobile-first physics exam prep PWA**. All user data lives locally on the device — there is no backend, no database, and no user accounts.

---

## Repository Layout

```
flux/
  frontend/          # React PWA (Vite)
  api/
    generate.js      # Vercel serverless — POST /api/generate (on-demand questions)
    sync.js          # Vercel serverless — optional Redis sync (unused by default)
  data/
    formulas.json    # Master formula database (9 topics, LaTeX)
  scripts/
    generate-daily.js  # Daily question generator (Claude CLI)
  docs/
  .github/workflows/
    main.yml         # Daily CI: generate + commit questions
```

---

## Web PWA (`frontend/`)

### Stack
React 18 · Vite 6 · Tailwind CSS 3 · shadcn/ui · React Router 6

### Routing
`src/pages.config.js` maps page names to components. `createPageUrl(name)` in `src/utils/index.ts` converts names to URL paths. The `Onboarding` page bypasses `Layout` (no header/nav). All other pages render inside `Layout.jsx`.

### Layout (`Layout.jsx`)
- Sticky header (56 px): title, session badge, theme toggle
- Scrollable `<main>` with `pt-14 pb-20` padding
- Fixed bottom nav (64 px): 5 tabs

### Pages (10 total)

| Page | Purpose |
|---|---|
| `Onboarding` | Exam date, daily goal, push permission setup |
| `Dashboard` | Countdown, streak, XP, daily progress |
| `Tasks` | Daily MCQ session (5-choice, timer, explanations) |
| `Theory` | Topic-based MCQ (theory difficulty) |
| `FormulaCards` | SM-2 spaced-repetition flashcards |
| `Cheatsheet` | Formula reference by topic |
| `MockExam` | Full (30 q/90 min) or mini (10 q/30 min) exam |
| `Progress` | Stats, topic heatmap, RT/DRT tracker, achievements |
| `SettingsPage` | Theme, exam date, notifications, reset |
| `ActiveSessions` | View and resume in-progress sessions |

### State (`src/utils/storage.js`)

| Function | Purpose |
|---|---|
| `lsGet(key, fallback)` / `lsSet(key, value)` | Safe localStorage wrappers |
| `checkAndUpdateStreak()` | Called once on Layout mount |
| `addXP(amount)` / `incrementTodayDone(count)` | XP and daily progress |
| `updateTopicStats(topic, correct, total)` | Per-topic accuracy |
| `checkAchievements()` / `unlockAchievement(id)` | Achievement system |

### Key localStorage keys

| Key | Type | Description |
|---|---|---|
| `theme` | `"dark" \| "light"` | UI theme |
| `streak_days` | number | Current streak |
| `streak_last_date` | ISO date | Date of last activity |
| `xp_total` / `today_xp` | number | Total and today's XP |
| `today_done` / `daily_goal` | number | Daily progress |
| `topic_stats` | `{ [topic]: { correct, total } }` | Per-topic accuracy |
| `achievements` | `[{ id, unlockedAt }]` | Unlocked achievements |
| `rt_results` | `[{ date, type, score, note }]` | RT/DRT history |
| `tasks_session` / `theory_session` / `exam_session` | object | In-progress sessions |
| `daily_questions_data` / `daily_questions_date` | object / ISO date | Cached daily questions |

### Design system
CSS variables defined in `Layout.jsx` (not Tailwind config):

```
--accent: #F97316   orange
--bg      page background
--card    card surface
--text    primary text
--muted   secondary text
--border  border / divider
```

Tailwind is used for spacing and layout only. Colors always go through CSS variables: `style={{ color: "var(--text)" }}`.

### Session persistence
Each practice page auto-saves full state to localStorage on every answer. On mount a saved session triggers a **Resume / Restart** modal. `saveSessionSnapshot(overrides)` merges explicit overrides to avoid stale closure bugs.

### Daily questions
Generated daily by CI, committed as `frontend/public/daily-questions.json`, fetched on first load of the day and cached in localStorage:

```json
{
  "date": "2026-03-05",
  "generated_at": "2026-03-05T06:05:12Z",
  "questions": {
    "Механика": { "1": [ ...theory ], "2": [ ...tasks ] }
  }
}
```

Cache is invalidated when `generated_at` is missing or the date changes.

---

## Serverless API (`api/`)

### `POST /api/generate`
Generates questions via Claude Haiku.

- Input: `{ topic, count, difficulty, formulaContext }`
- Auth: `ANTHROPIC_API_KEY` Vercel env variable — never stored in the repo

### `api/sync.js`
Optional Upstash Redis sync endpoint. Inactive by default; requires `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel env.

---

## Formula Database (`data/formulas.json`)

~82 entries across 9 topics. Per-entry schema:

```json
{
  "id": "m1",
  "name": "Второй закон Ньютона",
  "formula": "F = ma",
  "latex": "F = ma",
  "units": "Н",
  "subtopic": "Динамика",
  "variables": ["F — сила", "m — масса", "a — ускорение"],
  "difficulty": 1,
  "starred": false
}
```

---

## XP & Gamification

```
Correct answer:     +10 XP
Daily goal reached: +50 XP
Mock exam done:     +100 XP
7-day streak:       +150 XP

Levels:   0 Физик · 200 Механик · 500 Учёный · 1000 Академик · 2000 Эпштейн

Achievements: first_task, streak_7, answers_100, all_topics, perfect
```
