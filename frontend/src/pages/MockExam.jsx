import { useState, useEffect, useRef } from "react";
import Card from "@/components/ui/Card";
import OrangeButton from "@/components/ui/OrangeButton";
import ProgressBar from "@/components/ui/ProgressBar";
import { X, Flag } from "lucide-react";
import { generateQuestions } from "@/utils/generateQuestions";

const TOPICS = [
  "Механика", "Молекулярная физика", "Термодинамика",
  "Электростатика", "Постоянный ток", "Электромагнетизм",
  "Колебания и волны", "Оптика", "Квантовая и ядерная физика",
];
const LABELS = ["А", "Б", "В", "Г", "Д"];

const barColor = (pct) => pct >= 70 ? "#22C55E" : pct >= 50 ? "#EAB308" : pct >= 30 ? "#F97316" : "#EF4444";

function formatTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function saveExamSession(data) {
  try {
    localStorage.setItem("exam_session", JSON.stringify({
      ...data,
      flagged: [...data.flagged],
      selectedTopics: [...data.selectedTopics],
      savedAt: new Date().toISOString(),
    }));
  } catch {}
}

function loadExamSession() {
  try {
    const raw = localStorage.getItem("exam_session");
    if (!raw) return null;
    const s = JSON.parse(raw);
    return {
      ...s,
      flagged: new Set(s.flagged || []),
      selectedTopics: new Set(s.selectedTopics || TOPICS),
    };
  } catch {
    return null;
  }
}

export default function MockExam() {
  const [view, setView] = useState("format");
  const [format, setFormat] = useState("full");
  const [selectedTopics, setSelectedTopics] = useState(new Set(TOPICS));
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [timeLeft, setTimeLeft] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saveModal, setSaveModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumeModal, setResumeModal] = useState(() => !!localStorage.getItem("exam_session"));
  const timerRef = useRef(null);

  const fullQ = 30, miniQ = 10;
  const totalQ = format === "full" ? fullQ : miniQ;
  const totalTime = format === "full" ? 90 * 60 : 30 * 60;

  const toggleTopic = (t) => {
    setSelectedTopics(prev => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const startExam = async () => {
    setLoading(true);
    localStorage.removeItem("exam_session");
    try {
      const perTopic = Math.ceil(totalQ / selectedTopics.size);
      const batches = await Promise.all(
        [...selectedTopics].map(topic => generateQuestions(topic, perTopic, 2))
      );
      const pool = batches.flat().sort(() => Math.random() - 0.5).slice(0, totalQ);
      setQuestions(pool);
      setQIndex(0);
      setUserAnswers({});
      setFlagged(new Set());
      setTimeLeft(totalTime);
      setView("exam");
      timerRef.current = setInterval(() => setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); setView("results"); return 0; }
        return t - 1;
      }), 1000);
    } finally {
      setLoading(false);
    }
  };

  const continueSession = () => {
    const s = loadExamSession();
    if (!s) { setResumeModal(false); return; }
    setQuestions(s.questions);
    setQIndex(s.qIndex || 0);
    setUserAnswers(s.userAnswers || {});
    setFlagged(s.flagged);
    setFormat(s.format || "full");
    setSelectedTopics(s.selectedTopics);
    setTimeLeft(s.timeLeft || 0);
    setView("exam");
    setResumeModal(false);
    timerRef.current = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { clearInterval(timerRef.current); setView("results"); return 0; }
      return t - 1;
    }), 1000);
  };

  const restartSession = () => {
    localStorage.removeItem("exam_session");
    setResumeModal(false);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Persist stats on results
  useEffect(() => {
    if (view !== "results" || questions.length === 0) return;
    localStorage.removeItem("exam_session");
    try {
      const stats = JSON.parse(localStorage.getItem("topic_stats") || "{}");
      questions.forEach((q, i) => {
        const t = q.topic || "Другое";
        if (!stats[t]) stats[t] = { correct: 0, total: 0 };
        stats[t].total += 1;
        if (userAnswers[i] === q.correct) stats[t].correct += 1;
      });
      localStorage.setItem("topic_stats", JSON.stringify(stats));
    } catch {}
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAnswer = (idx) => {
    if (userAnswers[qIndex] !== undefined) return;
    const newAnswers = { ...userAnswers, [qIndex]: idx };
    setUserAnswers(newAnswers);
    saveExamSession({ questions, qIndex, userAnswers: newAnswers, flagged, format, selectedTopics, timeLeft });
    setTimeout(() => {
      if (qIndex + 1 < questions.length) setQIndex(i => i + 1);
      else { clearInterval(timerRef.current); setView("results"); }
    }, 300);
  };

  const toggleFlag = () => {
    setFlagged(prev => {
      const n = new Set(prev);
      n.has(qIndex) ? n.delete(qIndex) : n.add(qIndex);
      saveExamSession({ questions, qIndex, userAnswers, flagged: n, format, selectedTopics, timeLeft });
      return n;
    });
  };

  const correctCount = questions.filter((q, i) => userAnswers[i] === q.correct).length;
  const pct = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const stars = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
  const motivation = pct >= 80 ? "Отличная работа! 🎉" : pct >= 60 ? "Хороший результат! 💪" : "Продолжай стараться! 📚";

  const topicResults = TOPICS.map(t => {
    const tqs = questions.filter(q => q.topic === t);
    const correct = tqs.filter(q => {
      const qi = questions.indexOf(q);
      return userAnswers[qi] === q.correct;
    }).length;
    return { name: t, correct, total: tqs.length, pct: tqs.length > 0 ? Math.round((correct / tqs.length) * 100) : null };
  }).filter(t => t.total > 0);

  const flaggedQuestions = [...flagged].map(i => ({ index: i, q: questions[i] })).filter(f => f.q);
  const wrongQuestions = questions.map((q, i) => ({ i, q })).filter(({ i, q }) => userAnswers[i] !== undefined && userAnswers[i] !== q.correct);

  const ResumeModal = resumeModal ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4" style={{ background: "var(--card)" }}>
        <div>
          <p className="font-bold text-base" style={{ color: "var(--text)" }}>Незавершённый экзамен</p>
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

  // VIEW A — format selection
  if (view === "format") return (
    <>
      {ResumeModal}
      <div className="flex flex-col gap-4 p-4">
        <h1 className="text-xl font-bold pt-2" style={{ color: "var(--text)" }}>Пробный экзамен</h1>

        <div className="flex flex-col gap-3">
          {[
            { id: "full", emoji: "🎯", title: "Полный тест", sub: "30 вопросов • 90 минут", sub2: "Все темы физики" },
            { id: "mini", emoji: "⚡", title: "Мини-тест", sub: "10 вопросов • 30 минут", sub2: "Быстрая проверка" },
          ].map(f => (
            <Card key={f.id} onClick={() => setFormat(f.id)}
              style={{ border: `2px solid ${format === f.id ? "#F97316" : "var(--border)"}`, background: format === f.id ? "#FFF7ED" : "var(--card)" }}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{f.emoji}</span>
                <div>
                  <p className="font-semibold" style={{ color: "var(--text)" }}>{f.title}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{f.sub}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{f.sub2}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Выбрать темы:</p>
            <div className="flex gap-3">
              <button onClick={() => setSelectedTopics(new Set(TOPICS))} className="text-xs font-semibold" style={{ color: "#F97316" }}>Выбрать все</button>
              <button onClick={() => setSelectedTopics(new Set())} className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Снять все</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {TOPICS.map(t => (
              <button key={t} onClick={() => toggleTopic(t)}
                className="py-2 px-2 rounded-xl text-[11px] font-semibold text-center transition-all"
                style={{ background: selectedTopics.has(t) ? "#F97316" : "var(--card)", color: selectedTopics.has(t) ? "#fff" : "var(--muted)", border: `1px solid ${selectedTopics.has(t) ? "#F97316" : "var(--border)"}` }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <OrangeButton onClick={startExam} disabled={selectedTopics.size === 0 || loading}>
          {loading ? "Загрузка вопросов..." : "Начать экзамен"}
        </OrangeButton>
      </div>
    </>
  );

  // VIEW B — exam in progress
  if (view === "exam" && questions[qIndex]) {
    const q = questions[qIndex];
    const answered = userAnswers[qIndex] !== undefined;
    return (
      <div className="flex flex-col gap-4 p-4">
        {confirmExit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-4" style={{ background: "var(--card)" }}>
              <p className="font-bold text-base" style={{ color: "var(--text)" }}>Выйти из экзамена?</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Прогресс сохранится — можно будет продолжить.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmExit(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>Отмена</button>
                <button onClick={() => {
                  clearInterval(timerRef.current);
                  saveExamSession({ questions, qIndex, userAnswers, flagged, format, selectedTopics, timeLeft });
                  setView("format");
                  setResumeModal(true);
                  setConfirmExit(false);
                }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "#F97316" }}>Сохранить и выйти</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setConfirmExit(true)} className="flex items-center gap-1 text-sm" style={{ color: "var(--muted)" }}>
            <X size={16} /> Выйти
          </button>
          <span className="text-lg font-bold" style={{ color: timeLeft < 300 ? "#EF4444" : "var(--text)" }}>
            ⏱ {formatTime(timeLeft)}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>Вопрос {qIndex + 1}/{questions.length}</span>
        </div>

        <ProgressBar value={qIndex + 1} max={questions.length} />

        <p className="text-base leading-relaxed" style={{ color: "var(--text)" }}>{q.text}</p>

        <div className="flex flex-col gap-2">
          {q.options.map((opt, idx) => {
            const text = opt.replace(/^[АБВГД][:.]\s*/u, "");
            return (
              <button key={idx} onClick={() => handleAnswer(idx)}
                className="w-full min-h-[3.5rem] h-auto flex items-center justify-center px-4 py-3 rounded-2xl text-base transition-all"
                style={{
                  background: "var(--card)",
                  border: `1.5px solid ${answered && idx === userAnswers[qIndex] ? "#F97316" : "var(--border)"}`,
                  color: "var(--text)",
                }}>
                <span className="text-center leading-snug w-full"
                  style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>
                  <span className="font-semibold">{LABELS[idx]})</span>{" "}{text}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={() => { if (qIndex + 1 < questions.length) setQIndex(i => i + 1); else { clearInterval(timerRef.current); setView("results"); } }}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl" style={{ color: "var(--muted)", background: "var(--card)", border: "1px solid var(--border)" }}>
            Пропустить
          </button>
          <button onClick={toggleFlag}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-1"
            style={{ color: flagged.has(qIndex) ? "#F97316" : "var(--muted)", background: "var(--card)", border: `1px solid ${flagged.has(qIndex) ? "#F97316" : "var(--border)"}` }}>
            <Flag size={14} /> Отметить
          </button>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {questions.map((_, i) => (
            <button key={i} onClick={() => setQIndex(i)}
              className="shrink-0 w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{
                background: i === qIndex ? "#F97316" : userAnswers[i] !== undefined ? "#FED7AA" : "var(--border)",
                color: i === qIndex ? "#fff" : flagged.has(i) ? "#EF4444" : "var(--muted)",
                border: flagged.has(i) ? "2px solid #EF4444" : "none",
              }}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // VIEW C — results
  return (
    <div className="flex flex-col gap-4 p-4">
      {saveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 w-full max-w-xs flex flex-col gap-3" style={{ background: "var(--card)" }}>
            <p className="font-bold" style={{ color: "var(--text)" }}>Результат сохранён!</p>
            <p className="text-sm" style={{ color: "var(--muted)" }}>{format === "full" ? "Полный тест" : "Мини-тест"} • {pct}%</p>
            <button onClick={() => setSaveModal(false)} className="py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "#F97316" }}>OK</button>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 pt-4 pb-2">
        <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>{correctCount} / {questions.length} • {pct}%</p>
        <p className="text-2xl">{"⭐".repeat(stars)}{"☆".repeat(5 - stars)}</p>
        <p className="text-base font-semibold" style={{ color: "var(--text)" }}>{motivation}</p>
        <span className="mt-1 px-4 py-1.5 rounded-full text-sm font-bold text-white" style={{ background: "#F97316" }}>
          +{correctCount * (format === "full" ? 5 : 10)} XP 🎉
        </span>
      </div>

      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>По темам</p>
        {topicResults.map(t => (
          <div key={t.name} className="mb-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: "var(--text)" }}>{t.name}</span>
              <span className="font-semibold" style={{ color: barColor(t.pct) }}>{t.correct}/{t.total} ({t.pct}%)</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: "var(--border)" }}>
              <div className="h-2 rounded-full" style={{ width: `${t.pct}%`, background: barColor(t.pct) }} />
            </div>
          </div>
        ))}
      </Card>

      {flaggedQuestions.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--text)" }}>⚑ Помеченные вопросы ({flaggedQuestions.length})</p>
          {flaggedQuestions.map(({ index, q }) => (
            <div key={index} className="py-2 border-b last:border-0 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
              #{index + 1} {q.text.slice(0, 60)}...
            </div>
          ))}
        </Card>
      )}

      {showErrors && wrongQuestions.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Разбор ошибок</p>
          {wrongQuestions.map(({ i, q }) => (
            <div key={i} className="mb-4 pb-4 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs mb-2" style={{ color: "var(--text)" }}>#{i + 1} {q.text}</p>
              <p className="text-xs text-red-400">Ваш ответ: {q.options[userAnswers[i]]}</p>
              <p className="text-xs" style={{ color: "#22C55E" }}>Правильно: {q.options[q.correct]}</p>
            </div>
          ))}
        </Card>
      )}

      <div className="flex gap-3">
        <button onClick={() => setShowErrors(e => !e)}
          className="flex-1 py-3 rounded-2xl text-sm font-semibold border-2"
          style={{ borderColor: "#F97316", color: "#F97316", background: "var(--card)" }}>
          {showErrors ? "Скрыть ошибки" : "Разбор ошибок"}
        </button>
        <OrangeButton onClick={() => {
          const results = JSON.parse(localStorage.getItem("rt_results") || "[]");
          results.unshift({ date: new Date().toISOString().slice(0, 10), type: format === "full" ? "Полный" : "Мини", score: pct, notes: `${correctCount}/${questions.length}` });
          localStorage.setItem("rt_results", JSON.stringify(results));
          setSaveModal(true);
        }}>
          Сохранить результат
        </OrangeButton>
      </div>

      <button onClick={() => setView("format")} className="text-sm text-center" style={{ color: "var(--muted)" }}>
        ← Вернуться
      </button>
    </div>
  );
}
