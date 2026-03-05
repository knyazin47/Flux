// Утилита для получения вопросов из ежедневного статичного JSON.
// Файл /daily-questions.json генерируется GitHub Action каждый день.
// Кэшируем весь файл в localStorage (обновляем раз в сутки).

const CACHE_KEY = "daily_questions_data";
const CACHE_DATE_KEY = "daily_questions_date";
export const CACHE_TS_KEY = "daily_questions_ts";

function today() {
  return new Date().toISOString().split("T")[0];
}

// Читаем кэш: возвращает объект questions или null
function readCache() {
  try {
    if (localStorage.getItem(CACHE_DATE_KEY) !== today()) return null;
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Пишем кэш
function writeCache(questionsObj) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(questionsObj));
    localStorage.setItem(CACHE_DATE_KEY, today());
    localStorage.setItem(CACHE_TS_KEY, new Date().toISOString());
  } catch {
    // localStorage переполнен — игнорируем
  }
}

// Загружаем свежий daily-questions.json с сервера
async function fetchDailyQuestions() {
  const res = await fetch(`/daily-questions.json?d=${today()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.questions; // { "Механика": { "1": [...], "2": [...] }, ... }
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
      allQuestions = await fetchDailyQuestions();
      writeCache(allQuestions);
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
