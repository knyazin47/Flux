// Semantic version — update this when releasing new iterations.
// History:
//   1.0.0  Initial scaffold: 9 pages, base UI, localStorage layer
//   1.1.0  Session persistence, ActiveSessions page, resume/restart modals
//   1.2.0  De-branding, documentation, .gitignore, .env.example
//   1.3.0  UI refinement, active-recall flashcard fix, versioning system
//   1.4.0  Rebranding to Flux, icon set, manifest fix
//   1.5.0  SettingsPage updates, cache metadata requirement, GitHub link
//   1.5.1  Fix AI language bug (Belarusian→Russian), README branding corrections
//   1.5.2  Fix CI: git pull--rebase before push; log claude stderr; switch --print to -p
//   1.6.0  FlameIcon SVG (active/gray), remove Onboarding, MSK streak, "Серия",
//          Tasks uses daily_goal, settings slider, copy toast, exam date 2026-06-05
//   1.6.1  Settings cleanup (no emojis, no time picker, slider style), Tasks/Theory
//          dropdown+mode selector, Progress stat cards centered, RT table "Заметки"
//   1.6.2  Fix streak: increment only when flame lit (≥1 task done), not on app open
//   2.0.0  Public release: remove mobile app, clean dead deps, streak rework (MSK/day-1),
//          refresh button with spin animation, slider thumb fix, GitHub link
//   2.1.0  Achievements: 9 tracked, real unlock logic, progress bars, lucide icons
//   2.2.0  Swipe navigation between main pages, push notifications via Service Worker
export const APP_VERSION = "2.2.0";
