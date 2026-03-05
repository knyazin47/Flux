# Architecture

## Overview

The app is a **mobile-first Progressive Web App** (max-width 390px) built with React 18 + Vite. It is fully client-side — there is no backend, no database, and no user accounts. All state lives in `localStorage`.

---

## Directory Layout

```
frontend/
  src/
    pages/           # Route-level components (one per screen)
    components/
      ui/            # shadcn/ui primitives (Button, Dialog, etc.)
    utils/
      index.ts       # createPageUrl() routing helper
      storage.js     # All localStorage read/write logic
    lib/
      AuthContext.jsx  # No-op auth stub (kept for structural compatibility)
      PageNotFound.jsx # 404 page
    api/
      base44Client.js  # No-op API stub
    Layout.jsx         # App shell: header, bottom nav, theme, session badge
    pages.config.js    # Page registry (name → component mapping)
  public/
    daily-questions.json  # Committed daily by GitHub Action CI
    manifest.json         # PWA manifest
```

---

## Routing

`src/pages.config.js` maps page names to components. `createPageUrl(name)` in `src/utils/index.ts` converts a name to its URL path. React Router 6 handles navigation.

The `Onboarding` page is registered without the shared `Layout` (no header/nav). All other pages render inside `Layout.jsx`.

---

## State Management

All persistent state is `localStorage`. No React context or global state store is used beyond the auth stub.

### Storage Utilities (`src/utils/storage.js`)

| Function | Purpose |
|---|---|
| `lsGet(key, fallback)` | Safe JSON parse from localStorage |
| `lsSet(key, value)` | JSON stringify to localStorage |
| `checkAndUpdateStreak()` | Called on Layout mount; advances or resets streak |
| `addXP(amount)` | Adds XP to `xp_total` and `today_xp` |
| `incrementTodayDone(count)` | Increments `today_done` |
| `updateTopicStats(topic, correct, total)` | Updates per-topic accuracy |
| `checkAchievements()` / `unlockAchievement(id)` | Achievement system |

### Key localStorage Keys

| Key | Type | Description |
|---|---|---|
| `theme` | `"dark" \| "light"` | UI theme |
| `streak_days` | number | Current streak count |
| `streak_last_date` | ISO string | Date of last activity |
| `xp_total` | number | Total XP earned |
| `today_xp` | number | XP earned today |
| `today_done` | number | Questions answered today |
| `daily_goal` | number | Daily question target |
| `topic_stats` | `{ [topic]: { correct, total } }` | Per-topic accuracy |
| `achievements` | `[{ id, unlockedAt }]` | Unlocked achievements |
| `rt_results` | `[{ date, type, score, note }]` | RT/DRT exam history |
| `tasks_session` | object | In-progress daily session |
| `theory_session` | object | In-progress theory session |
| `exam_session` | object | In-progress mock exam |
| `daily_questions_data` | object | Cached daily questions |
| `daily_questions_date` | ISO string | Cache date for daily questions |

---

## Session Persistence

Each practice page (Tasks, Theory, MockExam) auto-saves its full state to a dedicated localStorage key on every answer and on exit. On mount, it detects a saved session and presents a **Resume / Restart** modal.

Session save uses a `saveSessionSnapshot(overrides)` pattern that takes a base snapshot of current React state and merges explicit override values to avoid stale closure issues.

`MockExam` serializes `Set` objects (flagged questions, selected topics) as arrays for JSON compatibility.

---

## Layout & Theme

`Layout.jsx` defines CSS variables on `:root` / `.dark` that all components consume via `style={{ color: "var(--text)" }}` etc.:

```
--accent:  #F97316  (orange)
--bg       page background
--card     card background
--text     primary text
--muted    secondary text
--border   border color
```

Tailwind is used for spacing and layout. Component colors use the CSS variable pattern rather than Tailwind color utilities.

The layout has:
- Sticky header (56px): back button, title, session badge, theme toggle, settings link
- Scrollable `<main>` with `pt-14 pb-20` padding
- Fixed bottom navigation (64px): 5 tabs

---

## Daily Questions

Questions are generated daily by a GitHub Action running `scripts/generate-daily.js` using the `claude` CLI. The output is committed as `frontend/public/daily-questions.json`.

Structure:
```json
{
  "date": "2026-03-05",
  "questions": {
    "Механика": {
      "1": [ ...questions ],
      "2": [ ...questions ]
    }
  }
}
```

The frontend fetches this static file on first load of the day and caches it in `localStorage` under `daily_questions_data` + `daily_questions_date`.

---

## Formula Database

`data/formulas.json` is the master formula database (~82 entries). Each formula has:

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

Used directly in `FormulaCards` and `Cheatsheet` pages, and provided as context to the Claude CLI question generator.

---

## XP & Gamification

```
Correct answer:     +10 XP
Daily goal reached: +50 XP
Mock exam done:     +100 XP
7-day streak:       +150 XP

Levels:
  0    Физик
  200  Механик
  500  Учёный
  1000 Академик
  2000 Эйнштейн
```

Achievements: `first_task`, `streak_7`, `answers_100`, `all_topics`, `perfect`
