// Утилита для получения вопросов из ежедневного статичного JSON.
// Файл /daily-questions.json генерируется GitHub Action каждый день.
// Кэшируем весь файл в localStorage (обновляем раз в сутки).

const CACHE_KEY = "daily_questions_data";
const CACHE_DATE_KEY = "daily_questions_date";
export const CACHE_TS_KEY = "daily_questions_ts";
export const CACHE_GENERATED_AT_KEY = "daily_questions_generated_at";

function today() {
  return new Date().toISOString().split("T")[0];
}

// Читаем кэш: возвращает объект questions или null
function readCache() {
  try {
    if (localStorage.getItem(CACHE_DATE_KEY) !== today()) return null;
    if (!localStorage.getItem(CACHE_GENERATED_AT_KEY)) return null; // force re-fetch if metadata missing
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Пишем кэш из полного объекта данных { date, generated_at, questions }
function writeCache(fullData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(fullData.questions));
    localStorage.setItem(CACHE_DATE_KEY, today());
    localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
    localStorage.setItem(CACHE_GENERATED_AT_KEY, fullData.generated_at || fullData.date || "");
  } catch {
    // localStorage переполнен — игнорируем
  }
}

// Загружаем свежий daily-questions.json с сервера, возвращает полный объект
async function fetchDailyQuestions() {
  const res = await fetch(`/daily-questions.json?d=${today()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { date, generated_at, questions }
}

/**
 * Подгрузить вопросы при старте приложения.
 * Вызывается из Layout один раз при монтировании.
 * Бросает ошибку "no_cache" если нет интернета И нет никакого кэша.
 */
export async function prefetchQuestions() {
  if (readCache()) return { fresh: false };
  try {
    const data = await fetchDailyQuestions();
    writeCache(data);
    return { fresh: true };
  } catch {
    const staleRaw = localStorage.getItem(CACHE_KEY);
    if (!staleRaw) throw new Error("no_cache");
    return { fresh: false, stale: true };
  }
}

/**
 * Получить вопросы по теме.
 * @param {string} topic      — "Механика", "Оптика" и т.д.
 * @param {number} count      — сколько вопросов вернуть (из 15 доступных)
 * @param {number} difficulty — 1 (теория) или 2 (задания)
 * @returns {Promise<Array>}  — перемешанный массив из count вопросов
 */
export async function generateQuestions(topic, count = 10, difficulty = 2) {
  let allQuestions = readCache();

  if (!allQuestions) {
    try {
      const data = await fetchDailyQuestions();
      writeCache(data);
      allQuestions = data.questions;
    } catch (err) {
      console.warn("Не удалось загрузить daily-questions.json:", err.message);
      // Fallback: вернуть устаревший кэш если есть
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        allQuestions = raw ? JSON.parse(raw) : null;
      } catch {}
      if (!allQuestions) return [];
    }
  }

  const pool = allQuestions[topic]?.[String(difficulty)] ?? [];
  // Перемешиваем и берём нужное количество
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

/**
 * Принудительно сбросить кэш (например, при смене даты).
 */
export function clearQuestionsCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(CACHE_DATE_KEY);
}
