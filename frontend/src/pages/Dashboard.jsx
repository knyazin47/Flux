import { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FileText, CreditCard, BookOpen, FlaskConical } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function getDaysLeft(examDateStr) {
  if (!examDateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exam  = new Date(examDateStr);
  const diff  = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
  return diff;
}

function daysWord(n) {
  if (n === null) return "";
  const abs = Math.abs(n);
  if (abs % 10 === 1 && abs % 100 !== 11) return "день";
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return "дня";
  return "дней";
}

function formatDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

const LEVELS = [
  { name: "Физик",    min: 0,    max: 200  },
  { name: "Механик",  min: 200,  max: 500  },
  { name: "Учёный",   min: 500,  max: 1000 },
  { name: "Академик", min: 1000, max: 2000 },
  { name: "Эйнштейн", min: 2000, max: 3500 },
];

function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return { ...LEVELS[i], index: i + 1 };
  }
  return { ...LEVELS[0], index: 1 };
}

function ls(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; }
  catch { return fallback; }
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const examDate  = ls("exam_date", "2026-06-12");
  const examType  = ls("exam_type", "ЦТ");
  const dailyGoal = parseInt(ls("daily_goal", "10"));
  const todayDone = parseInt(ls("today_done", "0"));
  const streak    = parseInt(ls("streak_days", "0"));
  const todayXP   = parseInt(ls("today_xp", "0"));
  const totalXP   = parseInt(ls("xp_total", "0"));
  const rtResults = useMemo(() => { try { return JSON.parse(ls("rt_results", "[]")); } catch { return []; } }, []);

  const daysLeft = getDaysLeft(examDate);
  const level    = getLevel(totalXP);
  const xpInLevel = totalXP - level.min;
  const xpForLevel = level.max - level.min;
  const xpPct  = Math.min(100, Math.round((xpInLevel / xpForLevel) * 100));
  const goalPct = dailyGoal > 0 ? Math.min(100, Math.round((todayDone / dailyGoal) * 100)) : 0;

  const quickItems = [
    { icon: FileText,    label: "Задания",  sub: `${todayDone}/${dailyGoal} выполнено`, page: "Tasks",        color: "#EFF6FF", iconColor: "#3B82F6" },
    { icon: CreditCard,  label: "Формулы",  sub: "Карточки",                            page: "FormulaCards", color: "#FFF7ED", iconColor: "#F97316" },
    { icon: BookOpen,    label: "Теория",   sub: "По темам",                            page: "Theory",       color: "#F0FDF4", iconColor: "#22C55E" },
    { icon: FlaskConical,label: "Экзамен",  sub: "Пробный тест",                        page: "MockExam",     color: "#FDF4FF", iconColor: "#A855F7" },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">

      {/* ── Countdown ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 text-center text-white"
        style={{ background: "linear-gradient(135deg, #F97316 0%, #EA580C 100%)" }}>
        <p className="text-sm font-medium opacity-90">До {examType} осталось</p>
        <p className="text-6xl font-extrabold leading-none my-1">
          {daysLeft !== null ? Math.max(0, daysLeft) : "—"}
        </p>
        <p className="text-sm font-medium opacity-90">{daysWord(daysLeft)}</p>
        <p className="text-xs opacity-70 mt-1">{formatDate(examDate)}</p>
      </div>

      {/* ── Streak + Daily progress ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <div className="rounded-2xl p-4 flex flex-col items-center gap-1"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 32, lineHeight: 1 }}>{streak > 0 ? "🔥" : "💤"}</span>
          <p className="text-lg font-bold mt-1" style={{ color: "var(--text)" }}>{streak} {daysWord(streak)}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Стрик</p>
        </div>

        {/* Today's progress */}
        <div className="rounded-2xl p-4 flex flex-col gap-2"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Сегодня</p>
          <div className="w-full h-2 rounded-full" style={{ background: "var(--border)" }}>
            <div className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${goalPct}%`, background: "#F97316" }} />
          </div>
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>
            {todayDone} / {dailyGoal} задач
          </p>
          {todayXP > 0 && (
            <p className="text-xs font-semibold" style={{ color: "#F97316" }}>+{todayXP} XP сегодня</p>
          )}
        </div>
      </div>

      {/* ── XP / Level ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-4 flex flex-col gap-2"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
            ⚡ {level.name} • Ур. {level.index}
          </span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {xpInLevel} / {xpForLevel} XP
          </span>
        </div>
        <div className="w-full h-2 rounded-full" style={{ background: "var(--border)" }}>
          <div className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${xpPct}%`, background: "#F97316" }} />
        </div>
      </div>

      {/* ── Quick access ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {quickItems.map(({ icon: Icon, label, sub, page, color, iconColor }) => (
          <Link key={page} to={createPageUrl(page)}
            className="rounded-2xl p-4 flex flex-col gap-3 transition-transform active:scale-[0.97]"
            style={{ background: "var(--card)", border: "1px solid var(--border)", textDecoration: "none" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: color }}>
              <Icon size={20} style={{ color: iconColor }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Recent results ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold" style={{ color: "var(--text)" }}>Последние результаты</p>
          <Link to={createPageUrl("Progress")}
            className="text-xs font-semibold" style={{ color: "#F97316" }}>
            Все →
          </Link>
        </div>

        {rtResults.length === 0 ? (
          <div className="rounded-2xl py-8 text-center"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Нет результатов</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {rtResults.slice(-3).reverse().map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0"
                style={{ borderColor: "var(--border)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>{r.type || "Тест"}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{r.date}</p>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    background: r.score >= 70 ? "#F0FDF4" : r.score >= 50 ? "#FEFCE8" : "#FEF2F2",
                    color:      r.score >= 70 ? "#15803D" : r.score >= 50 ? "#92400E" : "#B91C1C",
                  }}>
                  {r.score}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
