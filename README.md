# Flux

> Physics exam preparation for the Belarusian ЦТ/ЦЭ 2026 — mobile-first PWA and native Android app.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-55-000020?logo=expo&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Daily practice** — MCQ question bank generated fresh every day by Claude AI
- **Formula cards** — SM-2 spaced-repetition flashcards for all 9 physics topics
- **Mock exams** — full (30 q / 90 min) or mini (10 q / 30 min) simulations
- **Progress tracking** — XP, streaks, topic heatmap, RT/DRT history, achievements
- **Offline-first** — all data stored locally; no accounts, no backend
- **Dark/light theme**, session auto-save and resume
- **Native Android app** — built with Expo, works on devices without Google Play Services

---

## Project Structure

```
flux/
  frontend/          # React PWA (Vite + Tailwind + shadcn/ui)
  mobile/            # Expo React Native app (Android + iOS)
  api/
    generate.js      # Vercel serverless — POST /api/generate (on-demand questions)
  data/
    formulas.json    # Master formula database (LaTeX + metadata, 9 topics)
  scripts/
    generate-daily.js  # Daily question generator (Claude CLI, runs in CI)
  docs/              # Architecture, development, contributing guides
  .github/workflows/
    main.yml         # Daily CI: generates questions and commits
```

---

## Web PWA

### Quick start

```bash
git clone https://github.com/knyazin47/flux.git
cd flux/frontend
npm install
cp .env.example .env.local   # env vars are optional stubs, app works without them
npm run dev
# → http://localhost:5173
```

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint (quiet — errors only) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript type check |

### Hosting

Deployed on Vercel. `vercel.json` configures the build and SPA rewrite rule.

---

## Android App

Built with Expo SDK 55. Works on devices without Google Play Services (no Firebase/FCM).

### Quick start

```bash
cd flux/mobile
npm install
npm start          # Expo dev server (Metro bundler)
```

### Build APK (sideload)

```bash
# Requires eas-cli + Expo account
eas build --platform android --profile preview
```

The `preview` profile in `mobile/eas.json` produces a sideloadable `.apk`.

### Local debug build (no EAS queue)

```bash
npx expo prebuild --platform android
cd android
gradlew.bat assembleDebug
# APK → android/app/build/outputs/apk/debug/app-debug.apk
```

Requires Android SDK + JDK 17.

---

## Daily Question Generation

A GitHub Action runs daily at **09:00 Minsk time** (UTC+3) and commits a fresh `frontend/public/daily-questions.json`. The mobile app fetches the same file from the Vercel deployment.

Run locally:

```bash
node scripts/generate-daily.js
```

Requires the `claude` CLI authenticated via `claude auth login`. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

---

## Tech Stack

| | Web | Mobile |
|---|---|---|
| Framework | React 18 + Vite 6 | Expo SDK 55 + React Native 0.83 |
| Language | JavaScript + TypeScript | TypeScript |
| Styling | Tailwind CSS + shadcn/ui | React Native StyleSheet |
| Navigation | React Router 6 | React Navigation 7 |
| Storage | `localStorage` | AsyncStorage |
| Notifications | — | expo-notifications (local only) |
| CI | GitHub Actions + Claude CLI | EAS Build |
| Hosting | Vercel | Sideload APK |

---

## Gamification

| Event | XP |
|---|---|
| Correct answer | +10 |
| Daily goal reached | +50 |
| Mock exam completed | +100 |
| 7-day streak | +150 |

Levels: **Физик** (0) → **Механик** (200) → **Учёный** (500) → **Академик** (1000) → **Эпштейн** (2000)

---

## Physics Topics

Механика · Молекулярная физика · Термодинамика · Электростатика · Постоянный ток · Электромагнетизм · Колебания и волны · Оптика · Квантовая и ядерная физика

---

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

## License

[MIT](LICENCE.txt)
