import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Play, Trash2, ClipboardList } from "lucide-react";
import OrangeButton from "@/components/ui/OrangeButton";

const SESSION_CONFIGS = [
  { key: "tasks_session",  label: "Ежедневные задания", icon: "📝", page: "Tasks",    getProgress: (s) => `Вопрос ${(s.qIndex || 0) + 1} из ${s.questions?.length || 0} • ${s.activeTopic || ""}` },
  { key: "theory_session", label: "Теория",              icon: "📚", page: "Theory",   getProgress: (s) => `Вопрос ${(s.qIndex || 0) + 1} из ${s.sessionQ?.length || 0} • ${s.selectedTopic || ""}` },
  { key: "exam_session",   label: "Пробный экзамен",     icon: "🎯", page: "MockExam", getProgress: (s) => `Вопрос ${(s.qIndex || 0) + 1} из ${s.questions?.length || 0} • ${s.format === "full" ? "Полный тест" : "Мини-тест"}` },
];

export default function ActiveSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const found = SESSION_CONFIGS.map(cfg => {
      const raw = localStorage.getItem(cfg.key);
      if (!raw) return null;
      try {
        const s = JSON.parse(raw);
        return { ...cfg, session: s };
      } catch {
        return null;
      }
    }).filter(Boolean);
    setSessions(found);
  }, []);

  const discard = (key) => {
    localStorage.removeItem(key);
    setSessions(prev => prev.filter(s => s.key !== key));
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 min-h-[60vh]">
        <ClipboardList size={48} style={{ color: "var(--muted)" }} />
        <p className="text-base font-semibold text-center" style={{ color: "var(--text)" }}>
          Нет незавершённых тестов
        </p>
        <p className="text-sm text-center" style={{ color: "var(--muted)" }}>
          Все сессии завершены
        </p>
        <OrangeButton onClick={() => navigate(createPageUrl("Dashboard"))}>
          На главную
        </OrangeButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold pt-2" style={{ color: "var(--text)" }}>Активные тесты</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {sessions.length} незавершённых {sessions.length === 1 ? "тест" : "теста"}
      </p>

      {sessions.map(cfg => {
        const s = cfg.session;
        const progress = cfg.getProgress(s);
        const savedAt = s.savedAt
          ? new Date(s.savedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
          : null;

        return (
          <div key={cfg.key} className="rounded-2xl p-4 flex flex-col gap-3"
            style={{ background: "var(--card)", border: "2px solid #F97316" }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "var(--text)" }}>{cfg.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#F97316" }}>{progress}</p>
                {savedAt && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Сохранено в {savedAt}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => discard(cfg.key)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold border"
                style={{ borderColor: "var(--border)", color: "var(--muted)", background: "var(--card)" }}>
                <Trash2 size={14} /> Удалить
              </button>
              <button onClick={() => navigate(createPageUrl(cfg.page))}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
                style={{ background: "#F97316" }}>
                <Play size={14} fill="white" /> Продолжить
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
