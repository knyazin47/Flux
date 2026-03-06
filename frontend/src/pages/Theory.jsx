import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import OrangeButton from "@/components/ui/OrangeButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { X, ChevronDown, Star, Check } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { generateQuestions } from "@/utils/generateQuestions";
import { addXP, incrementTodayDone, updateTopicStats, checkAchievements } from "@/utils/storage";

function TeX({ formula }) {
  const html = katex.renderToString(formula, { throwOnError: false, displayMode: true });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const TOPICS_LIST = [
  "Все темы", "Механика", "Молекулярная физика", "Термодинамика",
  "Электростатика", "Постоянный ток", "Электромагнетизм",
  "Колебания и волны", "Оптика", "Квантовая и ядерная физика",
];
const LABELS = ["А", "Б", "В", "Г", "Д"];
const SESSION_COUNT = 15;

const TIMER_OPTIONS = [
  { label: "Нет",   value: 0   },
  { label: "30с",   value: 30  },
  { label: "1 мин", value: 60  },
  { label: "2 мин", value: 120 },
  { label: "3 мин", value: 180 },
];

const formatTime = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Theory() {
  const [selectedTopic, setSelectedTopic] = useState("Все темы");
  const [topicOpen,     setTopicOpen]     = useState(false);
  const [mode,          setMode]          = useState("topic");
  const [view,          setView]          = useState("start");
  const [qIndex,        setQIndex]        = useState(0);
  const [selected,      setSelected]      = useState(null);
  const [sessionQ,      setSessionQ]      = useState([]);
  const [answers,       setAnswers]       = useState([]);
  const [timerDuration, setTimerDuration] = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(0);
  const [loadError,     setLoadError]     = useState(null);
  const [confirmExit,   setConfirmExit]   = useState(false);
  const [timedOut,      setTimedOut]      = useState(false);
  const [resumeModal,   setResumeModal]   = useState(() => !!localStorage.getItem("theory_session"));
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (view !== "question" || timerDuration === 0) return;
    setTimeLeft(timerDuration);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current); setTimedOut(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [view, qIndex, timerDuration]);

  useEffect(() => {
    if (timedOut) { setTimedOut(false); handleNext(true); }
  }, [timedOut]); // eslint-disable-line

  const saveSessionSnapshot = (overrides = {}) => {
    const base = {
      sessionQ,
      qIndex,
      answers,
      timerDuration,
      selectedTopic,
      mode,
      currentSelected: selected,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("theory_session", JSON.stringify({ ...base, ...overrides }));
  };

  const continueSession = () => {
    const raw = localStorage.getItem("theory_session");
    if (!raw) { setResumeModal(false); return; }
    try {
      const s = JSON.parse(raw);
      setSessionQ(s.sessionQ);
      setQIndex(s.qIndex);
      setAnswers(s.answers || []);
      setTimerDuration(s.timerDuration || 0);
      setSelectedTopic(s.selectedTopic || "Все темы");
      setMode(s.mode || "topic");
      setSelected(s.currentSelected ?? null);
      setTimeLeft(s.timerDuration || 0);
      setView("question");
    } catch {}
    setResumeModal(false);
  };

  const restartSession = () => {
    localStorage.removeItem("theory_session");
    setResumeModal(false);
  };

  const handleExit = () => {
    clearInterval(timerRef.current);
    localStorage.removeItem("theory_session");
    setSelected(null);
    setView("start");
    setConfirmExit(false);
  };

  const start = async () => {
    setView("loading");
    setLoadError(null);
    localStorage.removeItem("theory_session");
    try {
      const topic = selectedTopic === "Все темы"
        ? TOPICS_LIST[Math.floor(Math.random() * (TOPICS_LIST.length - 1)) + 1]
        : selectedTopic;
      const qs = await generateQuestions(topic, SESSION_COUNT, 1);
      if (qs.length === 0) throw new Error("Нет вопросов");
      const pool = mode === "random" ? [...qs].sort(() => Math.random() - 0.5) : qs;
      setSessionQ(pool);
      setQIndex(0);
      setSelected(null);
      setAnswers([]);
      setTimeLeft(timerDuration);
      setView("question");
    } catch {
      setLoadError("Не удалось загрузить вопросы. Проверь интернет-соединение.");
      setView("start");
    }
  };

  const handleSelect = (idx) => {
    if (selected !== null) return;
    setSelected(idx);
    clearInterval(timerRef.current);
    saveSessionSnapshot({ currentSelected: idx });
  };

  const handleNext = (timeout = false) => {
    const q = sessionQ[qIndex];
    const correct = !timeout && selected === q.correct;
    const newAnswers = [...answers, { correct, topic: q.topic }];
    const isLast = qIndex + 1 >= sessionQ.length;
    const nextIndex = qIndex + 1;

    if (!isLast) {
      saveSessionSnapshot({ qIndex: nextIndex, answers: newAnswers, currentSelected: null });
    }

    const proceed = () => {
      setAnswers(newAnswers);
      if (isLast) {
        localStorage.removeItem("theory_session");
        const byTopic = {};
        newAnswers.forEach(({ topic, correct: c }) => {
          if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
          byTopic[topic].total += 1;
          if (c) byTopic[topic].correct += 1;
        });
        Object.entries(byTopic).forEach(([topic, { correct: c, total }]) => updateTopicStats(topic, c, total));
        const correctCount = newAnswers.filter(a => a.correct).length;
        addXP(correctCount * 10);
        incrementTodayDone(sessionQ.length);
        checkAchievements();
        setView("finished");
      } else {
        setQIndex(nextIndex);
      }
    };

    if (timeout) {
      proceed();
    } else {
      setSelected(null);
      setTimeout(proceed, 320);
    }
  };

  const correctCount = answers.filter((a) => a.correct).length;
  const pct = sessionQ.length > 0 ? Math.round((correctCount / sessionQ.length) * 100) : 0;
  const stars = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
  const motivation = pct >= 80 ? "Отличная работа! 🎉" : pct >= 60 ? "Хороший результат! 💪" : "Продолжай стараться! 📚";
  const weakTopics = sessionQ.reduce((acc, q, i) => {
    if (!answers[i]?.correct) acc[q.topic] = (acc[q.topic] || 0) + 1;
    return acc;
  }, {});

  const ResumeModal = resumeModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4" style={{ background: "var(--card)" }}>
        <div>
          <p className="font-bold text-base" style={{ color: "var(--text)" }}>Незавершённый тест по теории</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Продолжить с того места или начать заново?</p>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={continueSession}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "#F97316" }}>
            ▶ Продолжить
          </button>
          <button onClick={restartSession}
            className="w-full py-3 rounded-xl text-sm font-semibold border"
            style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--card)" }}>
            Начать заново
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Загрузка ─────────────────────────────────────────────────────────────────
  if (view === "loading") return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[60vh]">
      <div className="w-14 h-14 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      <p className="text-sm font-semibold text-center" style={{ color: "var(--muted)" }}>
        ИИ генерирует вопросы…
      </p>
    </div>
  );

  // ── Результаты ───────────────────────────────────────────────────────────────
  if (view === "finished") return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-col items-center gap-2 pt-4 pb-2">
        <p className="text-4xl font-bold" style={{ color: "var(--text)" }}>{correctCount} / {sessionQ.length}</p>
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Star key={i} size={26} fill={i < stars ? "#F97316" : "none"} stroke="#F97316" strokeWidth={1.5} />
          ))}
        </div>
        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{motivation}</p>
      </div>
      {Object.keys(weakTopics).length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Слабые места:</p>
          {Object.entries(weakTopics).map(([t, n]) => (
            <div key={t} className="flex justify-between text-sm py-1" style={{ color: "var(--muted)" }}>
              <span>{t}</span>
              <span className="text-red-400">{n} ошибок</span>
            </div>
          ))}
        </Card>
      )}
      <div className="flex flex-col gap-3">
        <OrangeButton onClick={() => setView("start")}>Назад</OrangeButton>
        <button onClick={start} className="w-full py-3 rounded-2xl text-sm font-semibold border-2"
          style={{ borderColor: "#F97316", color: "#F97316", background: "var(--card)" }}>
          Ещё раз
        </button>
      </div>
    </div>
  );

  // ── Вопрос ───────────────────────────────────────────────────────────────────
  if (view === "question") {
    const q = sessionQ[qIndex];
    return (
      <>
        {confirmExit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4" style={{ background: "var(--card)" }}>
              <p className="font-bold text-base" style={{ color: "var(--text)" }}>Выйти из теории?</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Прогресс не сохранится.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmExit(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                  Отмена
                </button>
                <button onClick={handleExit}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#EF4444" }}>
                  Выйти
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4 p-4" style={{ paddingBottom: selected !== null ? 144 : undefined }}>
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setConfirmExit(true)} className="flex items-center gap-1 text-sm" style={{ color: "var(--muted)" }}>
              <X size={16} /> Выйти
            </button>
            {timerDuration > 0 && (
              <span className="text-lg font-bold" style={{ color: timeLeft < 10 ? "#EF4444" : "var(--text)" }}>
                ⏱ {formatTime(timeLeft)}
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--muted)" }}>Вопрос {qIndex + 1}/{sessionQ.length}</span>
          </div>

          <ProgressBar value={qIndex + 1} max={sessionQ.length} />

          <Card>
            <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: "#F97316" }}>
              {q.topic}
            </p>
            <p className="text-base leading-relaxed" style={{ color: "var(--text)" }}>{q.text}</p>
          </Card>

          <div className="flex flex-col gap-2">
            {q.options.map((opt, idx) => {
              let bg = "var(--card)", border = "var(--border)", color = "var(--text)", icon = null;
              if (selected !== null) {
                if (idx === q.correct)     { bg = "#F0FDF4"; border = "#22C55E"; color = "#15803D"; icon = "check"; }
                else if (idx === selected) { bg = "#FEF2F2"; border = "#EF4444"; color = "#B91C1C"; icon = "wrong"; }
              }
              const text = opt.replace(/^[АБВГД][:.]\s*/u, "");
              return (
                <button key={idx} onClick={() => handleSelect(idx)}
                  className="w-full min-h-[3.5rem] h-auto relative flex items-center px-4 py-3.5 rounded-2xl text-base transition-all duration-200"
                  style={{ background: bg, border: `1.5px solid ${border}`, color }}>
                  <span className="w-full text-center leading-snug pr-8"
                    style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                    <span className="font-semibold">{LABELS[idx]})</span>{" "}{text}
                  </span>
                  {icon === "check" && (
                    <span className="absolute right-3 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#22C55E" }}>
                      <Check size={14} color="white" strokeWidth={2.5} />
                    </span>
                  )}
                  {icon === "wrong" && (
                    <span className="absolute right-3 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#EF4444" }}>
                      <X size={14} color="white" strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{
            overflow: "hidden",
            maxHeight: selected !== null ? "400px" : "0px",
            opacity: selected !== null ? 1 : 0,
            transition: "max-height 0.35s ease, opacity 0.3s ease",
          }}>
            {(q.formula || q.explanation) && (
              <div className="rounded-2xl p-4 flex flex-col gap-3 mt-1" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
                {q.formula && (
                  <div className="py-2 px-3 rounded-xl text-center overflow-x-auto" style={{ background: "rgba(255,255,255,0.6)" }}>
                    <TeX formula={q.formula} />
                  </div>
                )}
                {q.explanation && (
                  <p className="text-sm leading-relaxed" style={{ color: "#92400E" }}>💡 {q.explanation}</p>
                )}
                <button onClick={() => window.location.href = "/Cheatsheet"}
                  className="text-xs font-semibold text-left" style={{ color: "#F97316" }}>
                  → Открыть шпаргалку
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{
          position: "fixed",
          bottom: 64,
          left: 0,
          right: 0,
          padding: "20px 16px 12px",
          zIndex: 20,
          background: "linear-gradient(to bottom, transparent, var(--bg) 40%)",
          transform: selected !== null ? "translateY(0)" : "translateY(120%)",
          transition: "transform 0.35s ease",
        }}>
          <OrangeButton onClick={() => handleNext()}>
            {qIndex + 1 >= sessionQ.length ? "Завершить →" : "Следующий →"}
          </OrangeButton>
        </div>
      </>
    );
  }

  // ── Стартовый экран ──────────────────────────────────────────────────────────
  return (
    <>
      {ResumeModal}
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-xl font-bold pt-2" style={{ color: "var(--text)" }}>Теория</h1>

        {loadError && (
          <div className="px-4 py-3 rounded-2xl text-sm" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
            {loadError}
          </div>
        )}

        <div className="relative">
          <button onClick={() => setTopicOpen((o) => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium"
            style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}>
            {selectedTopic}
            <ChevronDown size={16} style={{ color: "var(--muted)" }} />
          </button>
          {topicOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-2xl overflow-hidden z-20 shadow-xl"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {TOPICS_LIST.map((t) => (
                <button key={t} onClick={() => { setSelectedTopic(t); setTopicOpen(false); }}
                  className="w-full text-left px-4 py-3 text-sm border-b last:border-0 transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    color: t === selectedTopic ? "#F97316" : "var(--text)",
                    background: t === selectedTopic ? "#FFF7ED" : "var(--card)",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {[{ id: "topic", label: "По теме" }, { id: "random", label: "Случайные" }].map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: mode === m.id ? "#F97316" : "var(--card)",
                color: mode === m.id ? "#fff" : "var(--muted)",
                border: `1px solid ${mode === m.id ? "#F97316" : "var(--border)"}`,
              }}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm px-1" style={{ color: "var(--muted)" }}>⏱ Таймер на вопрос</p>
          <div className="flex gap-1.5">
            {TIMER_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setTimerDuration(opt.value)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: timerDuration === opt.value ? "#F97316" : "var(--card)",
                  color: timerDuration === opt.value ? "#fff" : "var(--muted)",
                  border: `1px solid ${timerDuration === opt.value ? "#F97316" : "var(--border)"}`,
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <OrangeButton onClick={start}>Начать →</OrangeButton>
      </div>
    </>
  );
}
