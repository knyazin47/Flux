# Development Guide

## Prerequisites

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **npm** 9+
- **Claude CLI** (for daily question generation) — install via `npm install -g @anthropic-ai/claude-cli` and authenticate with `claude auth login`

---

## Local Setup

```bash
git clone https://github.com/your-org/flux.git
cd flux/frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```
VITE_BASE44_APP_ID=your_app_id          # legacy SDK compat, leave blank for local-only
VITE_BASE44_APP_BASE_URL=https://your-app.base44.app  # same
```

Start the dev server:

```bash
npm run dev
# → http://localhost:5173
```

---

## Scripts

All commands run from the `frontend/` directory.

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint (quiet — errors only) |
| `npm run lint:fix` | Run ESLint and auto-fix fixable issues |
| `npm run typecheck` | TypeScript type check via `jsconfig.json` |

---

## Daily Question Generation

The script `scripts/generate-daily.js` calls the Claude CLI to generate a fresh set of questions and writes them to `frontend/public/daily-questions.json`.

### Run locally

```bash
# From repo root
node scripts/generate-daily.js
```

Requirements:
- The `claude` CLI must be installed and authenticated (`claude auth login`)
- Questions are generated per topic and difficulty level using formulas from `data/formulas.json` as context

### CI (GitHub Actions)

`.github/workflows/main.yml` runs the script daily at 09:00 Minsk time (UTC+3) and commits the result. It can also be triggered manually via `workflow_dispatch`.

The workflow uses OAuth secrets — no API key is stored in the repo.

---

## Adding a New Page

1. Create `frontend/src/pages/MyPage.jsx`
2. Register it in `frontend/src/pages.config.js`:
   ```js
   import MyPage from './pages/MyPage';
   // In the PAGES object:
   "MyPage": MyPage,
   ```
3. Add a route to the bottom nav in `Layout.jsx` if needed
4. Navigate using:
   ```js
   import { createPageUrl } from "@/utils";
   navigate(createPageUrl("MyPage"));
   ```

---

## Design System

CSS variables are defined in `Layout.jsx` (not Tailwind config). Always use them for colors:

```jsx
// Correct
<div style={{ color: "var(--text)", background: "var(--card)" }}>

// Avoid hardcoded colors
<div className="text-slate-800 bg-white">
```

Available variables: `--accent`, `--bg`, `--card`, `--text`, `--muted`, `--border`

Tailwind is used for spacing, layout, and sizing only.

---

## localStorage Conventions

- Use `lsGet` / `lsSet` from `src/utils/storage.js` — they handle JSON parse errors gracefully
- Never access `localStorage` directly in components; always go through the utility layer
- Session state keys: `tasks_session`, `theory_session`, `exam_session` — include a `savedAt` timestamp

---

## Code Style

- ESLint is configured with `eslint-plugin-react`, `eslint-plugin-react-hooks`, and `eslint-plugin-unused-imports`
- Run `npm run lint:fix` before committing
- No test suite is configured

---

## Environment Variables Reference

See [`frontend/.env.example`](../frontend/.env.example) for the full list with descriptions.
