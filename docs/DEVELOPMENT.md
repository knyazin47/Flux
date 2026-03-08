# Development Guide

## Prerequisites

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **npm** 9+
- **Claude CLI** (for daily question generation only) — `npm install -g @anthropic-ai/claude-code`, then `claude auth login`

---

## Web PWA

```bash
git clone https://github.com/knyazin47/flux.git
cd flux/frontend
npm install
cp .env.example .env.local   # optional stubs — app works without them
npm run dev
# → http://localhost:5173
```

### Commands (run from `frontend/`)

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint (quiet — errors only) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript type check |

### Environment variables

`frontend/.env.example` lists all variables. The only variables present are legacy BASE44 SDK stubs — they can be left blank; the app is fully functional without them.

---

## Daily Question Generation

`scripts/generate-daily.js` calls the Claude CLI to produce a fresh question set and writes it to `frontend/public/daily-questions.json`.

### Run locally

```bash
# From repo root
node scripts/generate-daily.js
```

The `claude` CLI must be authenticated (`claude auth login`). Questions are generated per topic and difficulty level using `data/formulas.json` as context.

### CI (GitHub Actions)

`.github/workflows/main.yml` runs the script daily at **09:00 Minsk time** and commits the result. It can be triggered manually via `workflow_dispatch` in the GitHub Actions UI.

The workflow uses OAuth secrets stored in GitHub — no API key is in the repository.

---

## Versioning

Follows [SemVer](https://semver.org).

| Bump | When |
|---|---|
| Patch `0.0.x` | Bug fixes, style tweaks, minor text edits |
| Minor `0.x.0` | New features, logic changes, new content |
| Major `x.0.0` | Breaking changes, rebranding, architecture overhaul |

Bump version in **both** `frontend/package.json` and `frontend/src/version.js` (`APP_VERSION`). They must always match.

Every commit must start with the version tag: `v1.2.3: description`.

---

## Adding a New Web Page

1. Create `frontend/src/pages/MyPage.jsx`
2. Register it in `frontend/src/pages.config.js`
3. Add to bottom nav in `Layout.jsx` if needed
4. Navigate with:
   ```js
   import { createPageUrl } from "@/utils";
   navigate(createPageUrl("MyPage"));
   ```

---

## Design System

CSS variables are defined in `Layout.jsx`. Always use them for colors:

```jsx
// Correct
<div style={{ color: "var(--text)", background: "var(--card)" }}>

// Avoid hardcoded colors or Tailwind color utilities
<div className="text-slate-800 bg-white">
```

Available: `--accent`, `--bg`, `--card`, `--text`, `--muted`, `--border`

Tailwind is for spacing, layout, and sizing only.

---

## Storage Conventions

Use `lsGet` / `lsSet` from `src/utils/storage.js` — never access `localStorage` directly. Session keys (`tasks_session`, `theory_session`, `exam_session`) should include a `savedAt` timestamp.

---

## Code Style

- ESLint configured in `frontend/` — run `npm run lint:fix` before committing
- No test suite is configured
- All user-facing strings are in Russian
