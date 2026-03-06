// ── Safe localStorage ─────────────────────────────────────────────────────

export function lsGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return v; }
  } catch { return fallback; }
}

export function lsSet(key, value) {
  try {
    localStorage.setItem(
      key,
      typeof value === "string" ? value : JSON.stringify(value)
    );
  } catch { /* квота исчерпана — молча игнорируем */ }
}

// ── Date helpers ──────────────────────────────────────────────────────────

// MSK = UTC+3. Add 3 h so day boundary matches 00:00 Moscow time.
function todayStr() {
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date(Date.now() + 3 * 3600_000);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Streak ────────────────────────────────────────────────────────────────
// Вызывается один раз при каждом открытии приложения (из Layout).
// Правила:
//   lastDate == today     → ничего не делаем (уже обновлено сегодня)
//   lastDate == вчера     → стрик продолжается, +1 день
//   lastDate < вчера      → стрик сброшен в 0
//   lastDate === null     → первый запуск, стрик = 0

export function checkAndUpdateStreak() {
  const today = todayStr();
  const lastDate = lsGet("streak_last_date", null);

  if (lastDate === today) return; // уже обновлено сегодня

  // День сменился — обнуляем дневные счётчики
  lsSet("today_done", 0);
  lsSet("today_xp", 0);

  if (lastDate === yesterdayStr()) {
    lsSet("streak_days", Number(lsGet("streak_days", 0)) + 1);
  } else if (lastDate !== null) {
    lsSet("streak_days", 0); // пропустил день — сброс
  }

  lsSet("streak_last_date", today);
}

// ── XP ────────────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  correct_answer: 10,
  daily_task_set:  50,  // выполнил дневную цель
  mock_exam:      100,
  streak_7_days:  150,
};

export function addXP(amount) {
  const total   = Number(lsGet("xp_total",  0)) + amount;
  const todayXP = Number(lsGet("today_xp",  0)) + amount;
  lsSet("xp_total",  total);
  lsSet("today_xp",  todayXP);

  // Проверяем достижение стрика 7 дней
  checkStreakAchievement();

  return total;
}

// ── Дневной прогресс ──────────────────────────────────────────────────────

export function incrementTodayDone(count = 1) {
  const done = Number(lsGet("today_done", 0)) + count;
  lsSet("today_done", done);

  // Если выполнена дневная цель — бонус XP (один раз в день)
  const goal = Number(lsGet("daily_goal", 10));
  if (done === goal) {
    addXP(XP_REWARDS.daily_task_set);
  }

  return done;
}

// ── Статистика по темам ───────────────────────────────────────────────────

export function updateTopicStats(topic, correctCount, totalCount) {
  const stats = lsGet("topic_stats", {});
  if (!stats[topic]) stats[topic] = { correct: 0, total: 0 };
  stats[topic].correct += correctCount;
  stats[topic].total   += totalCount;
  lsSet("topic_stats", stats);
}

// ── РТ/ДРТ результаты ────────────────────────────────────────────────────

export function addRtResult({ date, type, score, note = "" }) {
  const results = lsGet("rt_results", []);
  results.push({ date, type, score, note });
  lsSet("rt_results", results);
}

// ── Достижения ────────────────────────────────────────────────────────────

const ACHIEVEMENTS_DEF = [
  { id: "first_task",  check: () => Number(lsGet("today_done", 0)) >= 1 },
  { id: "streak_7",    check: () => Number(lsGet("streak_days",  0)) >= 7 },
  { id: "answers_100", check: () => getTotalAnswers() >= 100 },
  { id: "all_topics",  check: () => Object.keys(lsGet("topic_stats", {})).length >= 9 },
  { id: "perfect",     check: () => false }, // выставляется вручную из MockExam
];

function getTotalAnswers() {
  const stats = lsGet("topic_stats", {});
  return Object.values(stats).reduce((s, t) => s + (t.total || 0), 0);
}

export function checkAchievements() {
  const unlocked = lsGet("achievements", []);
  const unlockedIds = new Set(unlocked.map((a) => a.id));
  const newOnes = [];

  for (const def of ACHIEVEMENTS_DEF) {
    if (!unlockedIds.has(def.id) && def.check()) {
      const entry = { id: def.id, unlockedAt: new Date().toISOString() };
      unlocked.push(entry);
      newOnes.push(entry);
    }
  }

  if (newOnes.length > 0) lsSet("achievements", unlocked);
  return newOnes; // вернём новые, чтобы показать уведомление при желании
}

export function unlockAchievement(id) {
  const unlocked = lsGet("achievements", []);
  if (unlocked.some((a) => a.id === id)) return;
  unlocked.push({ id, unlockedAt: new Date().toISOString() });
  lsSet("achievements", unlocked);
}

function checkStreakAchievement() {
  if (Number(lsGet("streak_days", 0)) >= 7) unlockAchievement("streak_7");
}
