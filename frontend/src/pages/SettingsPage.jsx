import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, X } from "lucide-react";
import { createPageUrl } from "@/utils";

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-[390px] rounded-t-3xl p-6 flex flex-col gap-4" style={{ background: "var(--card)" }}>
        <div className="flex justify-between items-center">
          <p className="font-bold text-base" style={{ color: "var(--text)" }}>{title}</p>
          <button onClick={onClose}><X size={20} style={{ color: "var(--muted)" }} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ left, right, onClick, red }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-3.5 border-b last:border-0"
      style={{ borderColor: "var(--border)", color: red ? "#EF4444" : "var(--text)" }}>
      <span className="text-sm">{left}</span>
      <span className="flex items-center gap-1 text-sm" style={{ color: red ? "#EF4444" : "var(--muted)" }}>{right}</span>
    </button>
  );
}

function SectionHeader({ label }) {
  return <p className="text-xs font-semibold mt-2 mb-1 px-1" style={{ color: "var(--muted)" }}>{label}</p>;
}

export default function SettingsPage() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [examDate, setExamDate] = useState(localStorage.getItem("exam_date") || "2026-06-12");
  const [examType, setExamType] = useState(localStorage.getItem("exam_type") || "ЦТ");
  const [dailyGoal, setDailyGoal] = useState(localStorage.getItem("daily_goal") || "10");
  const [notif, setNotif] = useState(localStorage.getItem("notif_enabled") === "true");
  const [notifTime, setNotifTime] = useState(localStorage.getItem("notif_time") || "20:00");
  const [modal, setModal] = useState(null); // date | type | reset | time

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const save = (key, val) => localStorage.setItem(key, val);

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); } catch { return d; }
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.href = createPageUrl("Onboarding");
  };

  return (
    <div className="flex flex-col gap-1 p-4">
      {modal === "date" && (
        <Modal title="Дата экзамена" onClose={() => setModal(null)}>
          <input type="date" value={examDate}
            onChange={e => { setExamDate(e.target.value); save("exam_date", e.target.value); }}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <button onClick={() => setModal(null)} className="w-full py-3 rounded-2xl text-sm font-bold text-white" style={{ background: "#F97316" }}>Готово</button>
        </Modal>
      )}
      {modal === "type" && (
        <Modal title="Тип экзамена" onClose={() => setModal(null)}>
          <div className="flex gap-2">
            {["ЦТ", "ЦЭ", "Оба"].map(t => (
              <button key={t} onClick={() => { setExamType(t); save("exam_type", t); setModal(null); }}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold"
                style={{ background: examType === t ? "#F97316" : "var(--bg)", color: examType === t ? "#fff" : "var(--muted)", border: `1px solid ${examType === t ? "#F97316" : "var(--border)"}` }}>
                {t}
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "time" && (
        <Modal title="Время напоминания" onClose={() => setModal(null)}>
          <input type="time" value={notifTime}
            onChange={e => { setNotifTime(e.target.value); save("notif_time", e.target.value); }}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }} />
          <button onClick={() => setModal(null)} className="w-full py-3 rounded-2xl text-sm font-bold text-white" style={{ background: "#F97316" }}>Готово</button>
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="Сбросить прогресс?" onClose={() => setModal(null)}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Все данные будут удалены. Это действие нельзя отменить.</p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-2xl text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>Отмена</button>
            <button onClick={handleReset} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: "#EF4444" }}>Сбросить</button>
          </div>
        </Modal>
      )}

      <h1 className="text-xl font-bold pt-2 mb-2" style={{ color: "var(--text)" }}>Настройки</h1>

      {/* Внешний вид */}
      <SectionHeader label="ВНЕШНИЙ ВИД" />
      <Card className="!py-0 !px-4">
        <div className="flex items-center justify-between py-3.5">
          <span className="text-sm" style={{ color: "var(--text)" }}>🌙 Тёмная тема</span>
          <Switch checked={dark} onCheckedChange={setDark} />
        </div>
      </Card>

      {/* Экзамен */}
      <SectionHeader label="ЭКЗАМЕН" />
      <Card className="!py-0 !px-4">
        <SettingRow left="📅 Дата ЦТ/ЦЭ" right={<>{formatDate(examDate)}<ChevronRight size={14} /></>} onClick={() => setModal("date")} />
        <SettingRow left="🎯 Тип экзамена" right={<>{examType}<ChevronRight size={14} /></>} onClick={() => setModal("type")} />
      </Card>

      {/* Ежедневная цель */}
      <SectionHeader label="ЕЖЕДНЕВНАЯ ЦЕЛЬ" />
      <Card>
        <div className="flex gap-2">
          {["5", "10", "15"].map(g => (
            <button key={g} onClick={() => { setDailyGoal(g); save("daily_goal", g); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{ background: dailyGoal === g ? "#F97316" : "var(--bg)", color: dailyGoal === g ? "#fff" : "var(--muted)", border: `1px solid ${dailyGoal === g ? "#F97316" : "var(--border)"}` }}>
              {g}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--muted)" }}>{dailyGoal} задач ежедневно</p>
      </Card>

      {/* Уведомления */}
      <SectionHeader label="УВЕДОМЛЕНИЯ" />
      <Card className="!py-0 !px-4">
        <div className="flex items-center justify-between py-3.5 border-b" style={{ borderColor: notif ? "var(--border)" : "transparent" }}>
          <span className="text-sm" style={{ color: "var(--text)" }}>🔔 Напоминания</span>
          <Switch checked={notif} onCheckedChange={v => { setNotif(v); save("notif_enabled", v); }} />
        </div>
        {notif && (
          <SettingRow left="⏰ Время" right={<>{notifTime}<ChevronRight size={14} /></>} onClick={() => setModal("time")} />
        )}
      </Card>

      {/* Данные */}
      <SectionHeader label="ДАННЫЕ" />
      <Card className="!py-0 !px-4">
        <SettingRow left="🗑️ Сбросить весь прогресс" right={null} onClick={() => setModal("reset")} red />
      </Card>

      <p className="text-xs text-center mt-4 pb-4" style={{ color: "var(--muted)" }}>Физика • Версия 1.0.0</p>
    </div>
  );
}