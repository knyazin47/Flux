import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { ChevronRight } from "lucide-react";

export default function Onboarding() {
  const [examType, setExamType] = useState("ЦТ");
  const [examDate, setExamDate] = useState("2026-06-12");
  const [dailyGoal, setDailyGoal] = useState("10");
  const [notifStatus, setNotifStatus] = useState("idle"); // idle | granted | denied

  useEffect(() => {
    if (localStorage.getItem("onboarding_complete") === "true") {
      window.location.href = createPageUrl("Dashboard");
    }
  }, []);

  const handleNotifications = async () => {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
  };

  const handleStart = () => {
    localStorage.setItem("onboarding_complete", "true");
    localStorage.setItem("exam_type", examType);
    localStorage.setItem("exam_date", examDate);
    localStorage.setItem("daily_goal", dailyGoal);
    window.location.href = createPageUrl("Dashboard");
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-start justify-center py-12 px-4">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* TOP SECTION */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <span style={{ fontSize: 64, lineHeight: 1 }}>⚛️📚🔥</span>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Физика ЦТ/ЦЭ</h1>
          <p className="text-sm text-gray-400">Подготовка к экзамену 2026</p>
        </div>

        <div className="w-full h-px bg-gray-100" />

        {/* EXAM TYPE */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700">Выбери экзамен:</label>
          <div className="flex gap-2">
            {["ЦТ", "ЦЭ", "Оба"].map((type) => (
              <button
                key={type}
                onClick={() => setExamType(type)}
                className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border
                  ${examType === type
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200"
                    : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"
                  }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* EXAM DATE */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700">Дата экзамена:</label>
          <div className="relative">
            <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-sm">
              <span className="text-xl">📅</span>
              <span className="flex-1 text-sm text-gray-700 font-medium">{formatDate(examDate)}</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>
        </div>

        {/* DAILY GOAL */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-semibold text-gray-700">Сколько задач в день?</label>
          <div className="flex gap-2">
            {["5", "10", "15"].map((goal) => (
              <button
                key={goal}
                onClick={() => setDailyGoal(goal)}
                className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border
                  ${dailyGoal === goal
                    ? "bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-200"
                    : "bg-white text-gray-500 border-gray-200 hover:border-orange-300"
                  }`}
              >
                {goal}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center">{dailyGoal} задач ежедневно</p>
        </div>

        {/* NOTIFICATIONS */}
        <div className="flex flex-col gap-2">
          <button
            onClick={handleNotifications}
            className={`w-full py-3.5 rounded-2xl border-2 text-sm font-semibold transition-all duration-200
              ${notifStatus === "granted"
                ? "border-green-400 text-green-600 bg-green-50"
                : notifStatus === "denied"
                ? "border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed"
                : "border-orange-400 text-orange-500 hover:bg-orange-50"
              }`}
            disabled={notifStatus === "denied"}
          >
            {notifStatus === "granted"
              ? "✅ Напоминания включены"
              : notifStatus === "denied"
              ? "🔕 Напоминания заблокированы"
              : "🔔 Включить напоминания"}
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white text-base font-bold shadow-lg shadow-orange-200 transition-all duration-200"
        >
          Начать подготовку →
        </button>

        <div className="pb-6" />
      </div>
    </div>
  );
}