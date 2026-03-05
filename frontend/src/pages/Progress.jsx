import { useState } from "react";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import OrangeButton from "@/components/ui/OrangeButton";
import { X } from "lucide-react";

const TOPICS = [
  "Механика", "Молекулярная физика", "Термодинамика",
  "Электростатика", "Постоянный ток", "Электромагнетизм",
  "Колебания и волны", "Оптика", "Квантовая и ядерная физика",
];

function loadTopicStats() {
  try {
    const raw = JSON.parse(localStorage.getItem("topic_stats") || "{}");
    return TOPICS.map(name => {
      const s = raw[name];
      const pct = s?.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
      return { name, pct, correct: s?.correct ?? 0, total: s?.total ?? 0 };
    }).sort((a, b) => a.pct - b.pct);
  } catch {
    return TOPICS.map(name => ({ name, pct: 0, correct: 0, total: 0 }));
  }
}

const ACHIEVEMENTS = [
  { emoji: "🔥", name: "Неостановимый", desc: "Стрик 7 дней", unlocked: false },
  { emoji: "⚡", name: "Скоростной", desc: "10 верных за 5 мин", unlocked: false },
  { emoji: "📚", name: "Все темы", desc: "Все 9 тем", unlocked: false },
  { emoji: "🎯", name: "Отличник", desc: "100% в тесте", unlocked: false },
  { emoji: "🧲", name: "Физик", desc: "Все формулы темы", unlocked: false },
  { emoji: "📅", name: "Неделя", desc: "7 дней в приложении", unlocked: false },
  { emoji: "🚀", name: "Старт", desc: "Первое задание", unlocked: true },
  { emoji: "💯", name: "Сотня", desc: "100 верных ответов", unlocked: false },
  { emoji: "🏆", name: "Чемпион", desc: "90%+ в полном тесте", unlocked: false },
];

const barColor = (pct) => pct >= 70 ? "#22C55E" : pct >= 50 ? "#EAB308" : pct >= 30 ? "#F97316" : "#EF4444";

function loadWeekData() {
  try {
    const raw = JSON.parse(localStorage.getItem("activity_history") || "[]");
    const arr = Array.isArray(raw) ? raw : [];
    return Array.from({ length: 30 }, (_, i) => arr[i] ?? 0);
  } catch {
    return Array(30).fill(0);
  }
}

const TABS = ["Статистика", "Темы", "РТ/ДРТ", "Достижения"];

function AddResultModal({ onClose, onSave }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState("РТ");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const save = () => {
    if (!score) return;
    onSave({ date, type, score: parseInt(score), notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-[390px] rounded-t-3xl p-6 flex flex-col gap-4" style={{ background: "var(--card)" }}>
        <div className="flex justify-between items-center">
          <p className="font-bold text-base" style={{ color: "var(--text)" }}>Добавить результат</p>
          <button onClick={onClose}><X size={20} style={{ color: "var(--muted)" }} /></button>
        </div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
        <div className="flex gap-2">
          {["ЦТ", "ЦЭ", "РТ", "ДРТ", "Другое"].map(t => (
            <button key={t} onClick={() => setType(t)}
              className="flex-1 py-2 rounded-xl text-xs font-semibold"
              style={{ background: type === t ? "#F97316" : "var(--bg)", color: type === t ? "#fff" : "var(--muted)", border: `1px solid ${type === t ? "#F97316" : "var(--border)"}` }}>
              {t}
            </button>
          ))}
        </div>
        <input type="number" min="0" max="100" value={score} onChange={e => setScore(e.target.value)}
          placeholder="Балл (0-100)" className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
        <input value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Заметки (необязательно)" className="w-full px-4 py-3 rounded-xl text-sm outline-none"
          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
        <OrangeButton onClick={save}>Сохранить</OrangeButton>
      </div>
    </div>
  );
}

export default function Progress() {
  const [tab, setTab] = useState("Статистика");
  const [showModal, setShowModal] = useState(false);
  const [rtResults, setRtResults] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rt_results") || "[]"); } catch { return []; }
  });

  const topicStats = loadTopicStats();
  const weekData = loadWeekData();

  const totalXP = parseInt(localStorage.getItem("xp_total") || "0");
  const streak = parseInt(localStorage.getItem("streak_days") || "0");
  const topicRaw = (() => { try { return JSON.parse(localStorage.getItem("topic_stats") || "{}"); } catch { return {}; } })();
  const totalAnswers = Object.values(topicRaw).reduce((s, t) => s + (t.total || 0), 0);
  const totalCorrect = Object.values(topicRaw).reduce((s, t) => s + (t.correct || 0), 0);
  const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;

  const maxBar = Math.max(...weekData, 1);

  const saveResult = (r) => {
    const next = [r, ...rtResults];
    setRtResults(next);
    localStorage.setItem("rt_results", JSON.stringify(next));
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {showModal && <AddResultModal onClose={() => setShowModal(false)} onSave={saveResult} />}

      <h1 className="text-xl font-bold pt-2" style={{ color: "var(--text)" }}>Прогресс</h1>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-semibold relative transition-colors"
            style={{ color: tab === t ? "#F97316" : "var(--muted)" }}>
            {t}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#F97316" }} />}
          </button>
        ))}
      </div>

      {/* TAB 1 */}
      {tab === "Статистика" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "⚡", val: totalXP, label: "Всего XP" },
              { icon: "🔥", val: streak, label: "Текущий стрик" },
              { icon: "📝", val: totalAnswers, label: "Ответов дано" },
              { icon: "✓", val: `${accuracy}%`, label: "Верных ответов" },
            ].map(s => (
              <Card key={s.label} className="flex flex-col gap-1">
                <span className="text-xl">{s.icon}</span>
                <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>{s.val}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{s.label}</span>
              </Card>
            ))}
          </div>

          <Card>
            <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Активность за 30 дней</p>
            <div className="flex items-end gap-[2px] h-16">
              {weekData.map((v, i) => (
                <div key={i} className="flex-1 rounded-t"
                  style={{ height: `${Math.max(2, (v / maxBar) * 56)}px`, background: v > 0 ? "#F97316" : "var(--border)" }} />
              ))}
            </div>
          </Card>
        </>
      )}

      {/* TAB 2 */}
      {tab === "Темы" && (
        <Card>
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Знание по темам</p>
          <div className="flex flex-col gap-4">
            {topicStats.map(t => (
              <div key={t.name}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "var(--text)" }}>{t.name}</span>
                  <span className="font-semibold" style={{ color: barColor(t.pct) }}>{t.pct}%</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ background: "var(--border)" }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${t.pct}%`, background: barColor(t.pct) }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 3 */}
      {tab === "РТ/ДРТ" && (
        <>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <div className="grid grid-cols-4 px-4 py-2 text-xs font-semibold" style={{ background: "var(--border)", color: "var(--muted)" }}>
              <span>Дата</span><span>Тип</span><span>Балл</span><span>📝</span>
            </div>
            {rtResults.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Нет результатов</p>
            )}
            {rtResults.map((r, i) => (
              <div key={i} className="grid grid-cols-4 px-4 py-3 text-xs" style={{ background: i % 2 === 0 ? "var(--card)" : "var(--bg)", color: "var(--text)" }}>
                <span>{r.date?.slice(5)}</span>
                <span>{r.type}</span>
                <span className="font-bold">{r.score}</span>
                <span className="truncate" style={{ color: "var(--muted)" }}>{r.notes || "—"}</span>
              </div>
            ))}
          </div>

          {rtResults.length > 1 && (
            <Card>
              <p className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Динамика баллов</p>
              <div className="flex items-end gap-2 h-16">
                {rtResults.slice().reverse().map((r, i) => {
                  const h = Math.max(4, (r.score / 100) * 56);
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 gap-1">
                      <div className="w-full rounded-t" style={{ height: h, background: "#F97316" }} />
                      <span className="text-[8px]" style={{ color: "var(--muted)" }}>{r.date?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <OrangeButton onClick={() => setShowModal(true)}>+ Добавить результат</OrangeButton>
        </>
      )}

      {/* TAB 4 */}
      {tab === "Достижения" && (
        <>
          <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>Достижения</p>
          <div className="grid grid-cols-3 gap-3">
            {ACHIEVEMENTS.map(a => (
              <div key={a.name} className="flex flex-col items-center gap-1 p-3 rounded-2xl relative"
                style={{ background: "var(--card)", border: `1px solid ${a.unlocked ? "#F97316" : "var(--border)"}`, opacity: a.unlocked ? 1 : 0.6 }}>
                <span className="text-2xl">{a.unlocked ? a.emoji : "🔒"}</span>
                <span className="text-[10px] font-semibold text-center" style={{ color: a.unlocked ? "var(--text)" : "var(--muted)" }}>{a.name}</span>
                <span className="text-[9px] text-center" style={{ color: "var(--muted)" }}>{a.desc}</span>
                {a.unlocked && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                    style={{ background: "#22C55E", color: "#fff" }}>✓</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}