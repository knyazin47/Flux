// AsyncStorage wrapper matching the web storage.js API.
// Function signatures are identical to frontend/src/utils/storage.js
// so logic is interchangeable between web and mobile.

import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Safe AsyncStorage ──────────────────────────────────────────────────────

export function lsGet(key: string, fallback: unknown = null): unknown {
  // Synchronous reads are not possible with AsyncStorage.
  // For synchronous callers (ThemeContext init), a small in-memory cache
  // is kept and hydrated on app start via hydrateCache().
  return memCache[key] !== undefined ? memCache[key] : fallback;
}

export async function lsGetAsync(key: string, fallback: unknown = null): Promise<unknown> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v === null) return fallback;
    try {
      const parsed = JSON.parse(v);
      memCache[key] = parsed;
      return parsed;
    } catch {
      memCache[key] = v;
      return v;
    }
  } catch {
    return fallback;
  }
}

export async function lsSet(key: string, value: unknown): Promise<void> {
  try {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    memCache[key] = value;
    await AsyncStorage.setItem(key, str);
  } catch {
    // quota exceeded — ignore silently
  }
}

export async function lsRemove(key: string): Promise<void> {
  try {
    delete memCache[key];
    await AsyncStorage.removeItem(key);
  } catch {}
}

// ── In-memory cache for synchronous lsGet reads ───────────────────────────
// Populated on app startup by hydrateCache().

const PERSISTED_KEYS = [
  "theme",
  "streak_days",
  "streak_last_date",
  "streak_active_date",
  "xp_total",
  "today_xp",
  "today_done",
  "daily_goal",
  "topic_stats",
  "achievements",
  "rt_results",
  "tasks_session",
  "theory_session",
  "exam_session",
  "onboarding_complete",
  "exam_date",
  "exam_type",
  "daily_questions_data",
  "daily_questions_date",
  "daily_questions_generated_at",
];

const memCache: Record<string, unknown> = {};

/**
 * Call once on app startup (before rendering) to populate the synchronous cache.
 */
export async function hydrateCache(): Promise<void> {
  try {
    const pairs = await AsyncStorage.multiGet(PERSISTED_KEYS);
    for (const [key, raw] of pairs) {
      if (raw === null) continue;
      try {
        memCache[key] = JSON.parse(raw);
      } catch {
        memCache[key] = raw;
      }
    }
  } catch {}
}

// ── Date helpers ───────────────────────────────────────────────────────────

// MSK = UTC+3. Add 3 h so day boundary matches 00:00 Moscow time.
function todayStr(): string {
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date(Date.now() + 3 * 3600_000);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ── Streak ────────────────────────────────────────────────────────────────
// streak_active_date — дата, когда пользователь выполнил ≥1 задание.
// Стрик +1 только если вчера огонёк был зажжён (activeDate === вчера).

export async function checkAndUpdateStreak(): Promise<void> {
  const today = todayStr();
  const lastDate = (await lsGetAsync("streak_last_date", null)) as string | null;

  if (lastDate === today) return;

  await lsSet("today_done", 0);
  await lsSet("today_xp", 0);

  const activeDate = (await lsGetAsync("streak_active_date", null)) as string | null;
  if (activeDate === yesterdayStr()) {
    await lsSet("streak_days", Number(lsGet("streak_days", 0)) + 1);
  } else if (lastDate !== null) {
    await lsSet("streak_days", 0);
  }

  await lsSet("streak_last_date", today);
}

// ── XP ────────────────────────────────────────────────────────────────────

export const XP_REWARDS = {
  correct_answer: 10,
  daily_task_set: 50,
  mock_exam: 100,
  streak_7_days: 150,
};

export async function addXP(amount: number): Promise<number> {
  const total = Number(lsGet("xp_total", 0)) + amount;
  const todayXP = Number(lsGet("today_xp", 0)) + amount;
  await lsSet("xp_total", total);
  await lsSet("today_xp", todayXP);
  await checkStreakAchievement();
  return total;
}

// ── Daily progress ────────────────────────────────────────────────────────

export async function incrementTodayDone(count = 1): Promise<number> {
  const done = Number(lsGet("today_done", 0)) + count;
  await lsSet("today_done", done);

  // Первое задание дня — фиксируем активный день для стрика
  if (done >= 1) {
    await lsSet("streak_active_date", todayStr());
  }

  const goal = Number(lsGet("daily_goal", 10));
  if (done === goal) {
    await addXP(XP_REWARDS.daily_task_set);
  }
  return done;
}

// ── Topic stats ───────────────────────────────────────────────────────────

export async function updateTopicStats(
  topic: string,
  correctCount: number,
  totalCount: number
): Promise<void> {
  const stats = (lsGet("topic_stats", {}) as Record<string, { correct: number; total: number }>);
  if (!stats[topic]) stats[topic] = { correct: 0, total: 0 };
  stats[topic].correct += correctCount;
  stats[topic].total += totalCount;
  await lsSet("topic_stats", stats);
}

// ── RT/DRT results ────────────────────────────────────────────────────────

export async function addRtResult({
  date,
  type,
  score,
  note = "",
}: {
  date: string;
  type: string;
  score: number;
  note?: string;
}): Promise<void> {
  const results = (lsGet("rt_results", []) as Array<unknown>);
  results.push({ date, type, score, note });
  await lsSet("rt_results", results);
}

// ── Achievements ──────────────────────────────────────────────────────────

interface Achievement {
  id: string;
  unlockedAt: string;
}

function getTotalAnswers(): number {
  const stats = lsGet("topic_stats", {}) as Record<string, { total: number }>;
  return Object.values(stats).reduce((s, t) => s + (t.total || 0), 0);
}

const ACHIEVEMENTS_DEF = [
  { id: "first_task", check: () => Number(lsGet("today_done", 0)) >= 1 },
  { id: "streak_7", check: () => Number(lsGet("streak_days", 0)) >= 7 },
  { id: "answers_100", check: () => getTotalAnswers() >= 100 },
  {
    id: "all_topics",
    check: () =>
      Object.keys(lsGet("topic_stats", {}) as object).length >= 9,
  },
  { id: "perfect", check: () => false },
];

export async function checkAchievements(): Promise<Achievement[]> {
  const unlocked = (lsGet("achievements", []) as Achievement[]);
  const unlockedIds = new Set(unlocked.map((a) => a.id));
  const newOnes: Achievement[] = [];

  for (const def of ACHIEVEMENTS_DEF) {
    if (!unlockedIds.has(def.id) && def.check()) {
      const entry: Achievement = { id: def.id, unlockedAt: new Date().toISOString() };
      unlocked.push(entry);
      newOnes.push(entry);
    }
  }

  if (newOnes.length > 0) await lsSet("achievements", unlocked);
  return newOnes;
}

export async function unlockAchievement(id: string): Promise<void> {
  const unlocked = (lsGet("achievements", []) as Achievement[]);
  if (unlocked.some((a) => a.id === id)) return;
  unlocked.push({ id, unlockedAt: new Date().toISOString() });
  await lsSet("achievements", unlocked);
}

async function checkStreakAchievement(): Promise<void> {
  if (Number(lsGet("streak_days", 0)) >= 7) await unlockAchievement("streak_7");
}
