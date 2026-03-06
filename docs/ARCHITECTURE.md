# Architecture

## Overview

Flux is a **mobile-first physics exam prep app** available as both a Progressive Web App and a native Android app. All user data lives locally on the device — there is no backend, no database, and no user accounts.

---

## Repository Layout

```
flux/
  frontend/          # React PWA (Vite)
  mobile/            # Expo React Native (Android + iOS)
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

## Mobile App (`mobile/`)

### Stack
Expo SDK 55 · React Native 0.83.2 · React 19.2.0 · TypeScript · React Navigation 7

### Startup sequence (`App.tsx`)

```
hydrateCache()          ← await before any lsGet
  ↓
onboarding_complete?
  No  → FirstRunScreen  ← fetch questions; no-internet error + retry on failure
  Yes → AppInner
          ↓
        checkAndUpdateStreak()
        prefetchQuestions()
        AppState listener → refreshNotifications() on every foreground
```

### Theme (`src/context/ThemeContext.tsx`)
Same color tokens as web CSS variables. Dark mode persisted via AsyncStorage `"theme"` key.

### Storage (`src/utils/storage.ts`)
AsyncStorage wrapper with an in-memory cache so `lsGet` is synchronous:

| Function | Notes |
|---|---|
| `hydrateCache()` | Await at startup before any `lsGet` |
| `lsGet(key, fallback)` | Synchronous — reads in-memory cache |
| `lsSet(key, value)` | Async — writes cache + AsyncStorage |
| `lsRemove(key)` | Async |

### Navigation (`src/navigation/index.tsx`)
5-tab bottom navigator. Each tab has its own `NativeStack`. Icons via Ionicons (`@expo/vector-icons`). `headerShown: false` everywhere.

### Screens (`src/screens/`)

| Screen | Key features |
|---|---|
| `Dashboard` | Countdown, streak/XP cards, quick-access 2×2, recent RT results |
| `Tasks` | FlatList MCQ, session save/restore, question count slider 1–15 |
| `FormulaCards` | SM-2 spaced repetition, `Animated` rotateY flip, plain-text formulas |
| `Progress` | 4 tabs (Статистика / Темы / РТ-ДРТ / Достижения), AddResultModal |
| `Settings` | Theme toggle, daily goal slider 1–15, smart notifications, reset |

All screens fade in on tab focus via `useFocusEffect` + `Animated.timing` (220 ms).

### Slider component (`src/components/Slider.tsx`)
Custom PanResponder-based slider — no external packages. Key design decisions:
- `containerWidth` stored in `useState` (not a ref) so `onLayout` triggers a re-render, making fill and thumb positions correct immediately on mount
- `info.current` ref holds `{ width, pageX }` for drag calculations (stable closure in PanResponder)
- `onPanResponderGrant` calls `measure()` to get current absolute `pageX` before calculating the value

Used in:
- **Tasks** — question count per session (1–15)
- **Settings** — daily goal (1–15)

### Smart notifications (`src/utils/notifications.ts`)
Activity-based (Duolingo-style). Three `DAILY` trigger slots: 12:00, 19:00, 22:00.

- Fires only when today's goal has **not** been met
- Cancelled the moment the goal is completed mid-session (`Tasks` screen)
- Re-evaluated on every app foreground via `AppState` listener in `App.tsx`

### Daily questions (`src/utils/generateQuestions.ts`)
Fetches from `https://flux-training.vercel.app/daily-questions.json` (configured in `src/config.ts`). Same cache structure and invalidation logic as the web app. `prefetchQuestions()` throws only when the fetch fails **and** no cached data exists — this is the signal for the FirstRun no-internet screen.

### Formula data
`mobile/src/data/formulas.json` is a copy of `data/formulas.json`. Sync manually when the master database changes.

### No-GMS constraint
No Firebase, FCM, or any Google SDK. Push notifications use `expo-notifications` local scheduling only. `app.json` sets `"googleServicesFile": null`. The EAS `preview` profile produces a sideloadable `.apk`.

### Module aliases
`@/` → `mobile/src/` via `babel-plugin-module-resolver` (configured in `babel.config.js` and `tsconfig.json`).

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
