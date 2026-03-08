import { useState, useRef } from "react";
import { Star, ArrowLeft } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import OrangeButton from "@/components/ui/OrangeButton";
import formulasData from "../../../data/formulas.json";
import { lsGet, lsSet, unlockAchievement } from "@/utils/storage";

// ── Построить карту тема → формулы из formulas.json ───────────────────────
const FORMULAS_BY_TOPIC = {};
for (const topic of formulasData.topics) {
  FORMULAS_BY_TOPIC[topic.name] = topic.formulas.map((f) => ({
    id:       f.id,
    name:     f.name,
    formula:  f.formula,
    latex:    f.latex || null,
    units:    f.units || "",
    note:     f.subtopic || "",
  }));
}
const ALL_TOPICS = Object.keys(FORMULAS_BY_TOPIC);
const ALL_FORMULAS = ALL_TOPICS.flatMap((t) => FORMULAS_BY_TOPIC[t]);

// ── KaTeX ──────────────────────────────────────────────────────────────────
function TeX({ formula }) {
  const html = katex.renderToString(formula, { throwOnError: false, displayMode: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── SM-2 сохранение оценки ─────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function saveRating(formulaId, rating) {
  const progress = lsGet("formula_progress", {});
  const cur = progress[formulaId] || { interval: 1 };
  const today = todayStr();

  let interval;
  let status;
  if (rating === "know") {
    interval = Math.round((cur.interval || 1) * 2.5);
    status = "know";
  } else if (rating === "hard") {
    interval = Math.max(1, cur.interval || 1);
    status = "hard";
  } else {
    interval = 1;
    status = "dontknow";
  }

  progress[formulaId] = {
    status,
    interval,
    nextReview: addDays(today, interval),
    lastRated: today,
  };
  lsSet("formula_progress", progress);
}

// ── Карточки для повторения (nextReview <= today или ни разу не оценены) ───
function getDueFormulas() {
  const progress = lsGet("formula_progress", {});
  const today = todayStr();
  return ALL_FORMULAS.filter((f) => {
    const p = progress[f.id];
    if (!p) return true; // никогда не оценена
    return p.nextReview <= today;
  });
}

// ── Прогресс по теме (сколько карточек "know") ────────────────────────────
function getTopicProgress() {
  const progress = lsGet("formula_progress", {});
  return ALL_TOPICS.map((t) => {
    const formulas = FORMULAS_BY_TOPIC[t];
    const known = formulas.filter((f) => progress[f.id]?.status === "know").length;
    return { name: t, total: formulas.length, done: known };
  });
}

// ── Компонент FlipCard ─────────────────────────────────────────────────────
function FlipCard({ formula, starred, onStar, onRate, index, total }) {
  const [flipped, setFlipped] = useState(false);
  const startX = useRef(null);

  const handleTouchStart = (e) => { startX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(dx) > 60) { onRate(dx > 0 ? "know" : "dontknow"); }
    startX.current = null;
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 flex-1">
      {/* Карточка */}
      <div className="w-full flex-1 max-h-72" style={{ perspective: 1000 }}
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div onClick={() => setFlipped((f) => !f)}
          className="relative w-full h-64 cursor-pointer transition-all duration-500"
          style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>

          {/* Лицевая сторона */}
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 shadow-lg"
            style={{ background: "var(--card)", border: "1px solid var(--border)", backfaceVisibility: "hidden" }}>
            <p className="text-xl font-semibold text-center mb-6" style={{ color: "var(--text)" }}>
              {formula.name}
            </p>
            <p className="text-sm text-center" style={{ color: "var(--muted)" }}>👆 Нажми чтобы увидеть формулу</p>
          </div>

          {/* Обратная сторона */}
          <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 shadow-lg"
            style={{ background: "var(--card)", border: "2px solid #F97316", backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <button onClick={(e) => { e.stopPropagation(); onStar(formula.id); }}
              className="absolute top-4 right-4 p-1">
              <Star size={20} fill={starred ? "#F97316" : "none"} stroke={starred ? "#F97316" : "var(--muted)"} />
            </button>

            {/* Формула: KaTeX если есть latex, иначе plain text */}
            <div className="py-3 px-4 rounded-xl mb-3 text-center" style={{ background: "#FFF7ED" }}>
              {formula.latex
                ? <span className="text-lg"><TeX formula={formula.latex} /></span>
                : <span className="text-2xl font-bold font-mono" style={{ color: "#F97316" }}>{formula.formula}</span>
              }
            </div>

            {formula.units && (
              <p className="text-sm mb-2" style={{ color: "var(--muted)" }}>{formula.units}</p>
            )}
            {formula.note && (
              <p className="text-xs text-center" style={{ color: "#6B7280" }}>{formula.note}</p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--muted)" }}>Карточка {index + 1} / {total}</p>

      {/* Кнопки оценки — появляются после переворота */}
      {flipped && (
        <div className="flex gap-2 w-full">
          {[
            { id: "dontknow", label: "😓 Не знаю", bg: "#FEF2F2", color: "#EF4444" },
            { id: "hard",     label: "😐 Сложно",  bg: "#FEFCE8", color: "#CA8A04" },
            { id: "know",     label: "😊 Знаю",    bg: "#F0FDF4", color: "#16A34A" },
          ].map((r) => (
            <button key={r.id} onClick={() => onRate(r.id)}
              className="flex-1 py-3 rounded-2xl text-xs font-semibold transition-all"
              style={{ background: r.bg, color: r.color }}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Экран завершения сессии ────────────────────────────────────────────────
function SummaryScreen({ ratings, total, onRestart }) {
  return (
    <div className="flex flex-col gap-4 p-6 items-center">
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>Сессия завершена!</p>
      <div className="flex flex-col gap-3 w-full">
        {[
          { id: "know",     label: "😊 Знаю",    color: "#16A34A", bg: "#F0FDF4" },
          { id: "hard",     label: "😐 Сложно",  color: "#CA8A04", bg: "#FEFCE8" },
          { id: "dontknow", label: "😓 Не знаю", color: "#EF4444", bg: "#FEF2F2" },
        ].map((r) => (
          <div key={r.id} className="flex justify-between items-center px-4 py-3 rounded-2xl"
            style={{ background: r.bg }}>
            <span className="text-sm font-semibold" style={{ color: r.color }}>{r.label}</span>
            <span className="text-lg font-bold" style={{ color: r.color }}>
              {ratings.filter((x) => x === r.id).length} / {total}
            </span>
          </div>
        ))}
      </div>
      <OrangeButton onClick={onRestart}>Повторить →</OrangeButton>
    </div>
  );
}

// ── Основной компонент ─────────────────────────────────────────────────────
export default function FormulaCards() {
  const [tab,         setTab]         = useState("topics");
  const [activeTopic, setActiveTopic] = useState(null);
  const [cardIndex,   setCardIndex]   = useState(0);
  const [ratings,     setRatings]     = useState([]);
  const [finished,    setFinished]    = useState(false);

  const [starred, setStarred] = useState(() => lsGet("starred_formulas", []));

  const toggleStar = (id) => {
    const next = starred.includes(id) ? starred.filter((s) => s !== id) : [...starred, id];
    setStarred(next);
    lsSet("starred_formulas", next);
  };

  const starredFormulas = ALL_FORMULAS.filter((f) => starred.includes(f.id));
  const dueFormulas     = getDueFormulas();
  const topicProgress   = getTopicProgress();

  const startTopic = (topic) => {
    setActiveTopic(topic);
    setCardIndex(0);
    setRatings([]);
    setFinished(false);
  };

  const handleRate = (rating) => {
    const cards = getActiveCards();
    saveRating(cards[cardIndex].id, rating);
    const newRatings = [...ratings, rating];
    setRatings(newRatings);
    if (cardIndex + 1 >= cards.length) {
      // Check if any topic is fully mastered
      const tp = getTopicProgress();
      if (tp.some(t => t.total > 0 && t.done === t.total)) {
        unlockAchievement("formula_topic");
      }
      setFinished(true);
    } else {
      setCardIndex((i) => i + 1);
    }
  };

  const getActiveCards = () => {
    if (activeTopic === "_due")     return dueFormulas;
    if (activeTopic === "_starred") return starredFormulas;
    return activeTopic ? FORMULAS_BY_TOPIC[activeTopic] : [];
  };

  // ── Режим прохождения карточек ───────────────────────────────────────────
  if (activeTopic) {
    const cards = getActiveCards();
    const topicLabel =
      activeTopic === "_due"     ? "Повторение" :
      activeTopic === "_starred" ? "⭐ Сложные" :
      activeTopic;

    if (finished) {
      return (
        <div className="flex flex-col min-h-full">
          <div className="flex items-center gap-3 p-4 pt-6">
            <button onClick={() => setActiveTopic(null)}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: "var(--card)", color: "var(--text)" }}>
              <ArrowLeft size={18} />
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>← {topicLabel}</span>
          </div>
          <SummaryScreen
            ratings={ratings}
            total={cards.length}
            onRestart={() => { setCardIndex(0); setRatings([]); setFinished(false); }}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-full">
        <div className="flex items-center justify-between p-4 pt-6">
          <button onClick={() => setActiveTopic(null)}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: "var(--text)" }}>
            <ArrowLeft size={16} /> {topicLabel}
          </button>
          <span className="text-xs" style={{ color: "var(--muted)" }}>{cardIndex + 1} / {cards.length}</span>
        </div>
        {cards[cardIndex] && (
          <FlipCard
            key={cardIndex}
            formula={cards[cardIndex]}
            starred={starred.includes(cards[cardIndex].id)}
            onStar={toggleStar}
            onRate={handleRate}
            index={cardIndex}
            total={cards.length}
          />
        )}
      </div>
    );
  }

  // ── Главный экран (список тем / вкладки) ─────────────────────────────────
  const tabs = [
    { id: "topics",  label: "По темам" },
    { id: "review",  label: `Повторение${dueFormulas.length > 0 ? ` (${dueFormulas.length})` : ""}` },
    { id: "hard",    label: `⭐ Сложные${starredFormulas.length > 0 ? ` (${starredFormulas.length})` : ""}` },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold pt-2" style={{ color: "var(--text)" }}>Карточки формул</h1>

      {/* Вкладки */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2.5 text-xs font-semibold relative"
            style={{ color: tab === t.id ? "#F97316" : "var(--muted)" }}>
            {t.label}
            {tab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#F97316" }} />
            )}
          </button>
        ))}
      </div>

      {/* Вкладка: По темам */}
      {tab === "topics" && (
        <div className="flex flex-col gap-3">
          {topicProgress.map((t) => (
            <button key={t.name} onClick={() => startTopic(t.name)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{t.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {t.done} / {t.total} знаю
                </p>
                <div className="mt-1.5 w-full h-1.5 rounded-full" style={{ background: "var(--border)" }}>
                  <div className="h-1.5 rounded-full"
                    style={{ width: `${t.total > 0 ? (t.done / t.total) * 100 : 0}%`, background: "#F97316" }} />
                </div>
              </div>
              <span style={{ color: "var(--muted)", fontSize: 18 }}>›</span>
            </button>
          ))}
        </div>
      )}

      {/* Вкладка: Повторение (SM-2) */}
      {tab === "review" && (
        <div className="flex flex-col gap-3">
          {dueFormulas.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>
              🎉 Все формулы повторены! Загляни завтра.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: "#F97316" }}>
                  {dueFormulas.length} карточек на сегодня
                </span>
              </div>
              <OrangeButton onClick={() => startTopic("_due")}>Начать повторение →</OrangeButton>
            </>
          )}
        </div>
      )}

      {/* Вкладка: ⭐ Сложные */}
      {tab === "hard" && (
        <div className="flex flex-col gap-3">
          {starredFormulas.length === 0 ? (
            <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>
              Отметь формулы звёздочкой ⭐ на обратной стороне карточки
            </p>
          ) : (
            <>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{starredFormulas.length} сложных формул</p>
              <OrangeButton onClick={() => startTopic("_starred")}>Повторить сложные →</OrangeButton>
            </>
          )}
        </div>
      )}
    </div>
  );
}
