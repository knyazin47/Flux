# Technical Roadmap

## Phase 1 — Foundation (complete)

- [x] Project scaffold: React 18 + Vite + Tailwind + shadcn/ui
- [x] 10 pages with full UI: Onboarding, Dashboard, Tasks, Theory, FormulaCards, Cheatsheet, MockExam, Progress, Settings, ActiveSessions
- [x] Layout shell: sticky header, fixed bottom nav, dark/light theme
- [x] localStorage state layer: XP, streak, topic stats, achievements
- [x] KaTeX formula rendering
- [x] SM-2 spaced-repetition in FormulaCards
- [x] Formula database (`data/formulas.json`, ~82 entries)
- [x] GitHub Actions CI for daily question generation
- [x] Vercel deployment

---

## Phase 2 — Session Persistence & UX Polish (complete)

- [x] Session auto-save on every answer (Tasks, Theory, MockExam)
- [x] Resume / Restart modal on re-entry
- [x] ActiveSessions page listing all in-progress tests
- [x] Session badge in header with count
- [x] Answer option text centering and overflow prevention
- [x] Fixed localStorage key mismatches in Progress page
- [x] De-branding: removed all Base44/Lovable references
- [x] Security: no hardcoded secrets, `.env.example` template
- [x] Git hygiene: comprehensive `.gitignore`
- [x] Professional README + `/docs` folder
- [x] Semantic versioning (`src/version.js`), v1.3.0
- [x] UI refinement: active-recall flashcard reset (`key={cardIndex}`), achievements tab label, level names
- [x] **Rebranding to Flux**: app name, manifest, icons, all metadata updated (v1.4.0)

---

## Phase 3 — Real Question Data (complete)

### 3.1 Connect daily-questions.json to Tasks

- [x] Parse `frontend/public/daily-questions.json` in Tasks.jsx via `generateQuestions.js`
- [x] Cache in localStorage with 24h TTL (`daily_questions_data`, `daily_questions_date`)
- [x] Fallback to cached data when offline; require `generated_at` metadata for cache validity

### 3.2 Wire localStorage writes on session completion

- [x] Tasks: `addXP`, `incrementTodayDone`, `updateTopicStats`, `checkAchievements`
- [x] Theory: same as Tasks (`addXP`, `incrementTodayDone`, `updateTopicStats`, `checkAchievements`)
- [x] MockExam: save result to `rt_results`, award XP, update `topic_stats`

### 3.3 Question bank for Theory and MockExam

- [x] Both Tasks and Theory pull from `daily-questions.json` via `generateQuestions(topic, count, difficulty)`
- [x] CI generates difficulty 1 (theory) and difficulty 2 (tasks) batches for all 9 topics

### 3.4 Onboarding → localStorage

- [x] Save `exam_date`, `exam_type`, `daily_goal` on "Начать"
- [x] Redirect to Dashboard; skip Onboarding if `onboarding_complete` is set

### 3.5 Settings → localStorage

- [x] All settings fields persist to localStorage on change

---

---

## Phase 4 — Progress & Achievements

- [ ] Activity log: record daily XP/questions for the 30-day chart in Progress
- [ ] Topic heatmap: read real `topic_stats` data (partially done)
- [ ] Achievement unlock triggers wired to all XP/stats writes
- [ ] RT/DRT table: save added entries to `rt_results` localStorage

---

## Phase 5 — PWA & Notifications

- [ ] `manifest.json`: icons, display mode, theme color, start URL
- [ ] Service worker: offline caching strategy for app shell + static assets
- [ ] Web Push API: request permission in Onboarding
- [ ] Daily reminder notification at user-configured time
- [ ] Test install flow on Android (Chrome) and iOS (Safari 16.4+)

---

## Phase 6 — Cross-Platform Targets

### Web (current — Vercel)
- No changes needed; already deployed

### Desktop (Tauri — preferred over Electron)
- [ ] Add `src-tauri/` config
- [ ] Window size constraints matching mobile layout
- [ ] File-system access for export (PDF progress reports)

### Mobile (Capacitor — iOS + Android native shell)
- [ ] `npx cap init`; configure `capacitor.config.ts`
- [ ] iOS target: Xcode build, TestFlight distribution
- [ ] Android target: Android Studio build, internal testing track
- [ ] Native push notifications via Capacitor Push Notifications plugin

---

## Phase 7 — Content Expansion

- [ ] Expand question bank: past ЦТ/ЦЭ/РТ/ДРТ questions
- [ ] Increase formula coverage: add remaining subtopic formulas
- [ ] Difficulty calibration: track per-question accuracy and adjust SM-2 weights
- [ ] Explanation quality pass: review all AI-generated explanations

---

## Phase 8 — Analytics & Sync (optional / future)

- [ ] Anonymous usage analytics (Plausible or self-hosted)
- [ ] Optional cloud sync via a lightweight backend (e.g., PocketBase)
- [ ] Export progress as PDF (jspdf — already in dependencies)
- [ ] Share streak card (html2canvas — already in dependencies)
