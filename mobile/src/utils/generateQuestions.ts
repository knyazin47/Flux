// Mobile adapter for daily-questions fetch/cache logic.
// Mirrors frontend/src/utils/generateQuestions.js but uses AsyncStorage.
// Function signatures are identical so logic is interchangeable.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { DAILY_QUESTIONS_URL } from "@/config";

const CACHE_KEY = "daily_questions_data";
const CACHE_DATE_KEY = "daily_questions_date";
export const CACHE_TS_KEY = "daily_questions_ts";
export const CACHE_GENERATED_AT_KEY = "daily_questions_generated_at";

type QuestionsMap = Record<string, Record<string, unknown[]>>;
type DailyData = {
  date: string;
  generated_at?: string;
  questions: QuestionsMap;
};

function today(): string {
  return new Date().toISOString().split("T")[0];
}

async function readCache(): Promise<QuestionsMap | null> {
  try {
    const pairs = await AsyncStorage.multiGet([
      CACHE_DATE_KEY,
      CACHE_GENERATED_AT_KEY,
      CACHE_KEY,
    ]);
    const map = Object.fromEntries(pairs);
    if (map[CACHE_DATE_KEY] !== today()) return null;
    if (!map[CACHE_GENERATED_AT_KEY]) return null; // force re-fetch if metadata missing
    return map[CACHE_KEY] ? JSON.parse(map[CACHE_KEY]) : null;
  } catch {
    return null;
  }
}

async function writeCache(fullData: DailyData): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [CACHE_KEY, JSON.stringify(fullData.questions)],
      [CACHE_DATE_KEY, today()],
      [CACHE_TS_KEY, new Date().toISOString()],
      [CACHE_GENERATED_AT_KEY, fullData.generated_at ?? fullData.date ?? ""],
    ]);
  } catch {
    // storage full — ignore
  }
}

async function fetchDailyQuestions(): Promise<DailyData> {
  const res = await fetch(`${DAILY_QUESTIONS_URL}?d=${today()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Prefetch daily questions on app startup.
 * Call once from App.tsx useEffect (mirrors web Layout behaviour).
 * Throws "no_cache" if offline and no cached data exists.
 */
export async function prefetchQuestions(): Promise<{ fresh: boolean; stale?: boolean }> {
  if (await readCache()) return { fresh: false };
  try {
    const data = await fetchDailyQuestions();
    await writeCache(data);
    return { fresh: true };
  } catch {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) throw new Error("no_cache");
    return { fresh: false, stale: true };
  }
}

/**
 * Get questions for a topic.
 * @param topic      - "Механика", "Оптика", etc.
 * @param count      - how many to return (up to 15 available)
 * @param difficulty - 1 (theory) or 2 (tasks)
 */
export async function generateQuestions(
  topic: string,
  count = 10,
  difficulty = 2
): Promise<unknown[]> {
  let allQuestions = await readCache();

  if (!allQuestions) {
    try {
      const data = await fetchDailyQuestions();
      await writeCache(data);
      allQuestions = data.questions;
    } catch (err) {
      console.warn("Failed to load daily-questions.json:", (err as Error).message);
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        allQuestions = raw ? JSON.parse(raw) : null;
      } catch {}
      if (!allQuestions) return [];
    }
  }

  const pool: unknown[] = allQuestions[topic]?.[String(difficulty)] ?? [];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Force-clear the questions cache (e.g. when date changes).
 */
export async function clearQuestionsCache(): Promise<void> {
  await AsyncStorage.multiRemove([CACHE_KEY, CACHE_DATE_KEY]);
}
