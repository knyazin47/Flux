# Физика ЦТ/ЦЭ 2026

> Mobile-first PWA for Belarus physics exam preparation (ЦТ/ЦЭ 2026).

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Daily practice** — 5-choice MCQ questions pulled from a daily-generated question bank
- **Theory mode** — topic-based question sessions with explanations and performance tracking
- **Mock exams** — full (30 questions / 90 min) or mini (10 questions / 30 min) exam simulations
- **Formula cards** — SM-2 spaced-repetition flashcards for all 9 physics topics
- **Cheatsheet** — formula reference with starred "hard" entries
- **Progress tracking** — XP, streaks, topic heatmap, RT/DRT history, achievements
- **Session persistence** — in-progress sessions auto-saved and resumable
- **Offline-ready** — fully localStorage-based, no accounts, no backend
- **Dark/light theme** — system-aware with manual toggle

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 6 |
| Styling | Tailwind CSS 3 + shadcn/ui |
| Routing | React Router 6 |
| Math rendering | KaTeX |
| Animations | Framer Motion |
| Storage | `localStorage` only |
| CI | GitHub Actions + Claude CLI |
| Hosting | Vercel |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
git clone https://github.com/your-org/physics-cte-2026.git
cd physics-cte-2026/frontend
npm install
cp .env.example .env.local
# Edit .env.local — see .env.example for details
npm run dev
```

The app runs at `http://localhost:5173`.

### Environment Variables

See [`frontend/.env.example`](frontend/.env.example) for all required and optional variables.

## Project Structure

```
Physics/
  frontend/            # React PWA (Vite)
    src/
      pages/           # One file per screen (9 pages)
      components/      # Shared UI components
      utils/           # localStorage helpers, XP logic
      lib/             # Routing helpers, auth stub
      api/             # No-op API client stub
    public/            # Static assets, daily-questions.json
  data/
    formulas.json      # Master formula database (LaTeX + metadata)
  scripts/
    generate-daily.js  # Daily question generation via Claude CLI
  docs/                # Architecture, development, contributing guides
  .github/workflows/
    main.yml           # Daily CI: generate questions + commit
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deeper technical dive.

## Daily Question Generation

A GitHub Action runs daily at **09:00 Minsk time** and commits a fresh `frontend/public/daily-questions.json`.

To run locally:

```bash
node scripts/generate-daily.js
```

Requires the `claude` CLI to be authenticated (OAuth). See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Scripts

All commands run from `frontend/`:

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint (quiet) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript type check |

## Physics Topics

Механика · Молекулярная физика · Термодинамика · Электростатика · Постоянный ток · Электромагнетизм · Колебания и волны · Оптика · Квантовая и ядерная физика

## Gamification

| Event | XP |
|---|---|
| Correct answer | +10 |
| Daily goal reached | +50 |
| Mock exam completed | +100 |
| 7-day streak | +150 |

Levels: Физик (0) → Механик (200) → Учёный (500) → Академик (1000) → Эйнштейн (2000)

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Roadmap

See [PLAN.md](PLAN.md) for the phased technical roadmap.

## License

MIT
