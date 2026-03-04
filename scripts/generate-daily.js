// scripts/generate-daily.js
// Запускается GitHub Action ежедневно.
// Использует claude CLI (OAuth, без API ключа) для генерации вопросов.
// Результат сохраняется в frontend/public/daily-questions.json

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const TOPICS = [
  "Механика",
  "Молекулярная физика",
  "Термодинамика",
  "Электростатика",
  "Постоянный ток",
  "Электромагнетизм",
  "Колебания и волны",
  "Оптика",
  "Квантовая и ядерная физика",
];

const DIFFICULTIES = [1, 2]; // 1 = лёгкий (теория), 2 = средний (задания)
const COUNT_PER_BATCH = 15;

function buildPrompt(topic, count, difficulty) {
  const diffLabel = difficulty === 1 ? "лёгкий" : "средний";
  return (
    `Сгенерируй ${count} вопросов по теме "${topic}" для белорусского экзамена ЦТ/ЦЭ 2026. ` +
    `Уровень сложности: ${diffLabel}. ` +
    `Правила: 5 вариантов ответа (А Б В Г Д), один правильный, объяснение 1-3 предложения. ` +
    `Формулы в поле formula в LaTeX, или null. ` +
    `Отвечай ТОЛЬКО валидным JSON массивом без markdown:\n` +
    `[{"id":"уник_id","topic":"${topic}","subtopic":"подтема","difficulty":${difficulty},` +
    `"text":"вопрос","formula":null,"options":["А: ...","Б: ...","В: ...","Г: ...","Д: ..."],` +
    `"correct":0,"explanation":"объяснение"}]`
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateBatch(topic, difficulty) {
  const prompt = buildPrompt(topic, COUNT_PER_BATCH, difficulty);

  const raw = execFileSync("claude", ["--print", prompt, "--output-format", "text"], {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60_000, // 60 секунд на запрос
  });

  // Убираем возможные markdown-блоки ```json ... ```
  const cleaned = raw.replace(/^```(?:json)?\s*/m, "").replace(/\s*```$/m, "").trim();
  const questions = JSON.parse(cleaned);

  if (!Array.isArray(questions)) throw new Error("Response is not an array");

  return questions.map((q, i) => ({
    ...q,
    id: q.id || `${topic.slice(0, 4)}_d${difficulty}_${i}`,
  }));
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n🚀 Generating daily questions for ${today}\n`);

  const result = {
    date: today,
    generated_at: new Date().toISOString(),
    questions: {},
  };

  let totalGenerated = 0;
  let errors = 0;

  for (const topic of TOPICS) {
    result.questions[topic] = {};

    for (const difficulty of DIFFICULTIES) {
      const label = difficulty === 1 ? "лёгкий" : "средний";
      process.stdout.write(`  ${topic} (${label})... `);

      try {
        const questions = generateBatch(topic, difficulty);
        result.questions[topic][difficulty] = questions;
        totalGenerated += questions.length;
        console.log(`✓ ${questions.length} вопросов`);
      } catch (err) {
        console.log(`✗ ${err.message}`);
        result.questions[topic][difficulty] = [];
        errors++;
      }

      // Пауза между запросами чтобы не перегружать
      await sleep(2000);
    }
  }

  const outputPath = path.join(__dirname, "../frontend/public/daily-questions.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf-8");

  console.log(`\n✅ Готово! ${totalGenerated} вопросов, ${errors} ошибок.`);
  console.log(`📁 ${outputPath}`);

  if (errors > 3) {
    console.error("Слишком много ошибок");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
