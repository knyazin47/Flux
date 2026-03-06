// Vercel Serverless Function — POST /api/generate
// Генерирует вопросы по физике через Claude Haiku 4.5.
// API ключ хранится в переменной окружения Vercel (ANTHROPIC_API_KEY).
// Frontend не имеет доступа к ключу.

const SYSTEM_PROMPT = `Ты генератор тестовых заданий по физике для экзаменов ЦТ/ЦЭ Беларуси 2026.

Правила:
- Отвечай ИСКЛЮЧИТЕЛЬНО на русском языке. Любой другой язык строго запрещён.
- Ровно 5 вариантов ответа (А, Б, В, Г, Д)
- Один правильный ответ
- Вопросы должны соответствовать программе ЦТ/ЦЭ Беларусь и быть разнообразными
- Объяснение должно быть кратким (1-3 предложения) и понятным школьнику
- Формулы в поле formula пиши в LaTeX (или null если не нужно)
- Отвечай ТОЛЬКО валидным JSON без markdown-блоков и лишнего текста`;

function buildUserPrompt(topic, count, difficulty, formulaContext) {
  const diffLabel = difficulty === 1 ? "лёгкий" : difficulty === 2 ? "средний" : "сложный";
  let prompt = `Сгенерируй ${count} вопрос${count > 1 ? "а" : ""} по теме "${topic}", уровень сложности: ${diffLabel}.`;

  if (formulaContext && formulaContext.length > 0) {
    const formulaList = formulaContext.slice(0, 10).map((f) => `- ${f.name}: ${f.formula}`).join("\n");
    prompt += `\n\nИспользуй эти формулы как основу для задач:\n${formulaList}`;
  }

  prompt += `\n\nОтветь JSON массивом:
[
  {
    "id": "уникальный_id",
    "topic": "${topic}",
    "subtopic": "подтема",
    "difficulty": ${difficulty},
    "text": "текст вопроса",
    "formula": "latex строка или null",
    "options": ["А: ...", "Б: ...", "В: ...", "Г: ...", "Д: ..."],
    "correct": 0,
    "explanation": "краткое объяснение"
  }
]`;

  return prompt;
}

export default async function handler(req, res) {
  // Только POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { topic, count = 10, difficulty = 2, formulaContext = [] } = req.body || {};

  if (!topic) {
    return res.status(400).json({ error: "topic is required" });
  }

  const safeCount = Math.min(Math.max(1, parseInt(count) || 10), 15);
  const safeDifficulty = [1, 2, 3].includes(parseInt(difficulty)) ? parseInt(difficulty) : 2;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: buildUserPrompt(topic, safeCount, safeDifficulty, formulaContext),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "AI service error", status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Парсим JSON из ответа
    let questions;
    try {
      // Убираем возможные markdown-блоки ```json ... ```
      const cleaned = text.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) throw new Error("Not an array");
    } catch {
      console.error("Failed to parse AI response:", text);
      return res.status(502).json({ error: "Invalid AI response format" });
    }

    // Добавляем id если отсутствует
    questions = questions.map((q, i) => ({
      ...q,
      id: q.id || `${topic.slice(0, 4)}_${Date.now()}_${i}`,
    }));

    return res.status(200).json({ questions });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
