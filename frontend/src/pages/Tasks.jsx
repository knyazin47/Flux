import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import TopicBadge from "@/components/ui/TopicBadge";
import OrangeButton from "@/components/ui/OrangeButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { ArrowLeft, Star, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { createPageUrl } from "@/utils";
import katex from "katex";
import "katex/dist/katex.min.css";
import { generateQuestions } from "@/utils/generateQuestions";
import { lsGet, incrementTodayDone, addXP, updateTopicStats, checkAchievements } from "@/utils/storage";

function TeX({ formula }) {
  const html = katex.renderToString(formula, { throwOnError: false, displayMode: true });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const TOPICS_FILTER = [
  "Все",
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

const LABELS = ["А", "Б", "В", "Г", "Д"];
const TIMER_START = 180;
const SESSION_COUNT = 10;

// Circular progress
function CircularProgress({ value, max, size = 80 }) {
  const pct = Math.min(100, (value / max) * 100);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F97316" strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray 0.4s" }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: 14, fontWeight: 700, fill: "var(--text)" }}>
        {value}/{max}
      </text>
    </svg>
  );
}

export default function Tasks() {
  const [view, setView]                   = useState("start"); // start | loading | question | results
  const [activeTopic, setActiveTopic]     = useState("Все");
  const [timerEnabled, setTimerEnabled]   = useState(false);
  const [sessionQuestions, setSessionQ]   = useState([]);
  const [qIndex, setQIndex]               = useState(0);
  const [selected, setSelected]           = useState(null);
  const [answers, setAnswers]             = useState([]);
  const [timeLeft, setTimeLeft]           = useState(TIMER_START);
  const [loadError, setLoadError]         = useState(null);
  const timerRef = useRef(null);

  const dailyGoal = parseInt(lsGet("daily_goal", "10"));
  const todayDone = parseInt(lsGet("today_done", "0"));

  useEffect(() => {
    if (view === "question" && timerEnabled) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) { clearInterval(timerRef.current); handleNext(true); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [view, qIndex, timerEnabled]);

  const startSession = async () => {
    setView("loading");
    setLoadError(null);
    try {
      const topic = activeTopic === "Все"
        ? TOPICS_FILTER[Math.floor(Math.random() * (TOPICS_FILTER.length - 1)) + 1]
        : activeTopic;
      const qs = await generateQuestions(topic, SESSION_COUNT, 2);
      if (qs.length === 0) throw new Error("Нет вопросов");
      setSessionQ(qs);
      setQIndex(0);
      setSelected(null);
      setAnswers([]);
      setTimeLeft(TIMER_START);
      setView("question");
    } catch (err) {
      setLoadError("Не удалось загрузить вопросы. Проверь подключение к интернету.");
      setView("start");
    }
  };

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    clearInterval(timerRef.current);
  };

  const handleNext = (timeout = false) => {
    const q = sessionQuestions[qIndex];
    const wasCorrect = !timeout && selected === q.correct;
    const newAnswers = [...answers, { topic: q.topic, correct: wasCorrect }];
    setAnswers(newAnswers);

    if (qIndex + 1 >= sessionQuestions.length) {
      // Сессия завершена — записываем прогресс
      const correctCount = newAnswers.filter((a) => a.correct).length;
      const earned = correctCount * 10;

      // XP и дневной прогресс
      addXP(earned);
      incrementTodayDone(sessionQuestions.length);

      // Статистика по темам
      const byTopic = {};
      newAnswers.forEach(({ topic, correct }) => {
        if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
        byTopic[topic].total += 1;
        if (correct) byTopic[topic].correct += 1;
      });
      Object.entries(byTopic).forEach(([topic, { correct, total }]) => {
        updateTopicStats(topic, correct, total);
      });

      checkAchievements();
      setView("results");
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setTimeLeft(TIMER_START);
    }
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const correctCount = answers.filter((a) => a.correct).length;
  const total = sessionQuestions.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  const weakTopics = sessionQuestions.reduce((acc, q, i) => {
    if (!answers[i]?.correct) acc[q.topic] = (acc[q.topic] || 0) + 1;
    return acc;
  }, {});

  const stars = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
  const motivation = pct >= 80 ? "Отличная работа! 🎉" : pct >= 60 ? "Хороший результат! 💪" : "Продолжай стараться! 📚";

  // ── Загрузка ────────────────────────────────────────────────────────────────
  if (view === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[60vh]">
        <div className="w-14 h-14 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
        <p className="text-sm font-semibold text-center" style={{ color: "var(--muted)" }}>
          ИИ генерирует вопросы…
        </p>
      </div>
    );
  }

  // ── Старт ────────────────────────────────────────────────────────────────────
  if (view === "start") return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold pt-2" style={{ color: "var(--text)" }}>Ежедневное задание</h1>

      {loadError && (
        <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
          {loadError}
        </div>
      )}

      <Card>
        <div className="flex items-center gap-4">
          <CircularProgress value={todayDone} max={dailyGoal} />
          <div>
            <p className="text-base font-bold" style={{ color: "var(--text)" }}>{todayDone} из {dailyGoal} выполнено</p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Дневная цель</p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TOPICS_FILTER.map((t) => (
          <button key={t} onClick={() => setActiveTopic(t)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
            style={{
              background: activeTopic === t ? "#F97316" : "var(--card)",
              color: activeTopic === t ? "#fff" : "var(--muted)",
              border: `1px solid ${activeTopic === t ? "#F97316" : "var(--border)"}`,
            }}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-sm" style={{ color: "var(--text)" }}>⏱ Таймер (3 мин)</span>
        <Switch checked={timerEnabled} onCheckedChange={setTimerEnabled} />
      </div>

      <OrangeButton onClick={startSession}>Начать →</OrangeButton>
    </div>
  );

  // ── Вопрос ────────────────────────────────────────────────────────────────────
  const q = sessionQuestions[qIndex];
  if (view === "question" && q) return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => { clearInterval(timerRef.current); setView("start"); }}
          className="w-9 h-9 flex items-center justify-center rounded-xl"
          style={{ background: "var(--card)", color: "var(--text)" }}>
          <ArrowLeft size={18} />
        </button>
        {timerEnabled && (
          <span className="text-sm font-bold" style={{ color: timeLeft < 30 ? "#EF4444" : "var(--text)" }}>
            {formatTime(timeLeft)}
          </span>
        )}
      </div>

      <div>
        <ProgressBar value={qIndex + 1} max={sessionQuestions.length} />
        <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>Вопрос {qIndex + 1} / {sessionQuestions.length}</p>
      </div>

      <TopicBadge label={q.topic} />

      <Card>
        <p className="text-base leading-relaxed" style={{ color: "var(--text)" }}>{q.text}</p>
        {q.formula && (
          <div className="mt-3 py-3 px-4 rounded-xl text-center overflow-x-auto" style={{ background: "var(--bg)" }}>
            <TeX formula={q.formula} />
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        {q.options.map((opt, idx) => {
          let bg = "var(--card)", border = "var(--border)", color = "var(--text)", icon = null;
          if (selected !== null) {
            if (idx === q.correct)      { bg = "#F0FDF4"; border = "#22C55E"; color = "#15803D"; icon = "check"; }
            else if (idx === selected)  { bg = "#FEF2F2"; border = "#EF4444"; color = "#B91C1C"; icon = "wrong"; }
          }
          return (
            <button key={idx} onClick={() => handleSelect(idx)}
              className="w-full h-14 flex items-center justify-between px-4 rounded-2xl text-left text-base transition-all duration-200"
              style={{ background: bg, border: `1.5px solid ${border}`, color }}>
              <span><span className="font-semibold mr-2">{LABELS[idx]})</span>{opt}</span>
              {icon === "check" && (
                <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#22C55E" }}>
                  <Check size={14} color="white" strokeWidth={2.5} />
                </span>
              )}
              {icon === "wrong" && (
                <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EF4444" }}>
                  <X size={14} color="white" strokeWidth={2.5} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div className="flex flex-col gap-3">
          {q.explanation && (
            <Card style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#92400E" }}>💡 {q.explanation}</p>
            </Card>
          )}
          <OrangeButton onClick={() => handleNext()}>
            {qIndex + 1 >= sessionQuestions.length ? "Завершить →" : "Следующий →"}
          </OrangeButton>
        </div>
      )}
    </div>
  );

  // ── Результаты ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-2 pt-4 pb-2">
        <p className="text-4xl font-bold" style={{ color: "var(--text)" }}>{correctCount} / {total}</p>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={26} fill={i < stars ? "#F97316" : "none"} stroke="#F97316" strokeWidth={1.5} />
          ))}
        </div>
        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{motivation}</p>
        <span className="mt-1 px-4 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: "#F97316" }}>
          +{correctCount * 10} XP заработано
        </span>
      </div>

      {Object.keys(weakTopics).length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Слабые места:</p>
          {Object.entries(weakTopics).map(([topic, n]) => (
            <div key={topic} className="flex justify-between text-sm py-1" style={{ color: "var(--muted)" }}>
              <span>{topic}</span>
              <span className="text-red-400">{n} ошибок</span>
            </div>
          ))}
        </Card>
      )}

      <div className="flex flex-col gap-3">
        <OrangeButton onClick={() => window.location.href = createPageUrl("Dashboard")}>
          На главную
        </OrangeButton>
        <button onClick={() => { setView("start"); setAnswers([]); }}
          className="w-full py-3 rounded-2xl text-sm font-semibold border-2"
          style={{ borderColor: "#F97316", color: "#F97316", background: "var(--card)" }}>
          Ещё раз
        </button>
      </div>
    </div>
  );
}
