import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import { Switch } from "@/components/ui/switch";
import { X, ChevronRight, RefreshCw } from "lucide-react";
import { APP_VERSION } from "@/version";
import { CACHE_GENERATED_AT_KEY, forceRefetchQuestions } from "@/utils/generateQuestions";

const SYNC_KEYS = [
  "streak_days", "streak_last_date",
  "xp_total", "today_xp", "today_done",
  "daily_goal", "topic_stats", "achievements",
  "rt_results", "exam_date", "exam_type",
  "onboarding_complete",
  "notif_enabled", "notif_time",
  "tasks_session", "theory_session", "exam_session",
];

function formatGeneratedAt(iso) {
  if (!iso) return "нет данных";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

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
  const [dailyGoal, setDailyGoal] = useState(localStorage.getItem("daily_goal") || "10");
  const [notif, setNotif] = useState(localStorage.getItem("notif_enabled") === "true");
  const [notifTime, setNotifTime] = useState(localStorage.getItem("notif_time") || "18:00");
  const [modal, setModal] = useState(null); // reset | sync-save | sync-load
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncCode, setSyncCode] = useState("");
  const [syncCodeInput, setSyncCodeInput] = useState("");
  const [syncError, setSyncError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);
  const [questionsUpdatedAt, setQuestionsUpdatedAt] = useState(
    () => formatGeneratedAt(localStorage.getItem(CACHE_GENERATED_AT_KEY))
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshQuestions = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const [{ generated_at }] = await Promise.all([
        forceRefetchQuestions(),
        new Promise((r) => setTimeout(r, 1400)), // минимум один полный цикл анимации
      ]);
      setQuestionsUpdatedAt(formatGeneratedAt(generated_at));
    } catch {
      await new Promise((r) => setTimeout(r, 1400));
    } finally {
      setRefreshing(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(syncCode);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  const resetSync = () => {
    setModal(null);
    setSyncLoading(false);
    setSyncCode("");
    setSyncCodeInput("");
    setSyncError("");
    setSyncSuccess(false);
  };

  const handleSyncSave = async () => {
    setSyncLoading(true);
    setSyncError("");
    try {
      const data = {};
      SYNC_KEYS.forEach((key) => {
        const val = localStorage.getItem(key);
        if (val !== null) data[key] = val;
      });
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", data }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSyncCode(json.code);
    } catch (e) {
      setSyncError(
        e.message === "not_configured"
          ? "Синхронизация не настроена на сервере"
          : "Не удалось создать код. Проверь интернет."
      );
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSyncLoad = async () => {
    setSyncLoading(true);
    setSyncError("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "load", code: syncCodeInput }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error === "not_found"
            ? "Код не найден или истёк"
            : "Ошибка загрузки данных"
        );
      }
      // Сначала очищаем все известные ключи, чтобы не оставалось "лишних" данных
      SYNC_KEYS.forEach((key) => localStorage.removeItem(key));
      // Затем восстанавливаем всё из резервной копии
      Object.entries(json.data).forEach(([key, value]) =>
        localStorage.setItem(key, value)
      );
      setSyncSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setSyncLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const save = (key, val) => localStorage.setItem(key, val);

  const scheduleNotif = (enabled, time) => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.active?.postMessage({ type: "SCHEDULE_NOTIF", enabled, time }))
      .catch(() => {});
  };

  const handleNotifToggle = (v) => {
    if (!v) {
      setNotif(false);
      save("notif_enabled", false);
      scheduleNotif(false, notifTime);
      return;
    }

    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      setNotif(true);
      save("notif_enabled", true);
      scheduleNotif(true, notifTime);
    } else if (Notification.permission === "denied") {
      alert("Уведомления заблокированы в настройках браузера. Разрешите их вручную и попробуйте снова.");
    } else {
      // "default" — must call inside sync user-gesture handler, use .then()
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          setNotif(true);
          save("notif_enabled", true);
          scheduleNotif(true, notifTime);
        }
      });
    }
  };

  const handleNotifTime = (t) => {
    setNotifTime(t);
    save("notif_time", t);
    if (notif) scheduleNotif(true, t);
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.href = "/Dashboard";
  };

  return (
    <div className="flex flex-col gap-1 p-4">
      {modal === "reset" && (
        <Modal title="Сбросить прогресс?" onClose={() => setModal(null)}>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Все данные будут удалены. Это действие нельзя отменить.</p>
          <div className="flex gap-3">
            <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-2xl text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>Отмена</button>
            <button onClick={handleReset} className="flex-1 py-3 rounded-2xl text-sm font-bold text-white" style={{ background: "#EF4444" }}>Сбросить</button>
          </div>
        </Modal>
      )}

      {modal === "sync-save" && (
        <Modal title="Создать код синхронизации" onClose={resetSync}>
          {!syncCode ? (
            <>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Получите 6-значный код и введите его на другом устройстве чтобы перенести прогресс. Код действует 30 дней.
              </p>
              {syncError && <p className="text-sm text-red-500">{syncError}</p>}
              <button
                onClick={handleSyncSave}
                disabled={syncLoading}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "#F97316" }}>
                {syncLoading ? "Создание..." : "Создать код"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-center" style={{ color: "var(--muted)" }}>Ваш код синхронизации:</p>
              <p className="text-4xl font-bold text-center py-2" style={{ color: "var(--text)", letterSpacing: "0.3em" }}>
                {syncCode}
              </p>
              <p className="text-xs text-center" style={{ color: "var(--muted)" }}>Действует 30 дней</p>
              <button
                onClick={handleCopyCode}
                className="w-full py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: copiedToast ? "#22C55E" : "#F97316", transition: "background 0.2s" }}>
                {copiedToast ? "Скопировано!" : "Скопировать код"}
              </button>
            </>
          )}
        </Modal>
      )}

      {modal === "sync-load" && (
        <Modal title="Восстановить прогресс" onClose={resetSync}>
          {syncSuccess ? (
            <p className="text-sm text-center py-2" style={{ color: "#22C55E" }}>Прогресс восстановлен. Перезагрузка...</p>
          ) : (
            <>
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                Введите 6-значный код с другого устройства.
              </p>
              <input
                value={syncCodeInput}
                onChange={(e) => setSyncCodeInput(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ""))}
                maxLength={6}
                placeholder="A3F7K2"
                className="w-full px-4 py-3 rounded-xl text-2xl font-bold text-center tracking-widest outline-none uppercase"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)", letterSpacing: "0.3em" }}
              />
              {syncError && <p className="text-sm text-red-500">{syncError}</p>}
              <div className="flex gap-3">
                <button onClick={resetSync} className="flex-1 py-3 rounded-2xl text-sm font-semibold border" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>Отмена</button>
                <button
                  onClick={handleSyncLoad}
                  disabled={syncLoading || syncCodeInput.length < 6}
                  className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50"
                  style={{ background: "#F97316" }}>
                  {syncLoading ? "Загрузка..." : "Восстановить"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      <h1 className="text-xl font-bold pt-2 mb-2" style={{ color: "var(--text)" }}>Настройки</h1>

      {/* Внешний вид */}
      <SectionHeader label="ВНЕШНИЙ ВИД" />
      <Card className="!py-0 !px-4">
        <div className="flex items-center justify-between py-3.5">
          <span className="text-sm" style={{ color: "var(--text)" }}>Тёмная тема</span>
          <Switch checked={dark} onCheckedChange={setDark} />
        </div>
      </Card>

      {/* Экзамен */}
      <SectionHeader label="ЭКЗАМЕН" />
      <Card className="!py-0 !px-4">
        <div className="w-full flex items-center justify-between py-3.5 border-b" style={{ borderColor: "var(--border)" }}>
          <span className="text-sm" style={{ color: "var(--text)" }}>Дата ЦТ</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>5 июня 2026</span>
        </div>
        <div className="w-full flex items-center justify-between py-3.5">
          <span className="text-sm" style={{ color: "var(--text)" }}>Тип экзамена</span>
          <span className="text-sm" style={{ color: "var(--muted)" }}>ЦТ</span>
        </div>
      </Card>

      {/* Ежедневная цель */}
      <SectionHeader label="ЕЖЕДНЕВНАЯ ЦЕЛЬ" />
      <Card>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm" style={{ color: "var(--text)" }}>Задач ежедневно</p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{dailyGoal}</p>
        </div>
        <input
          type="range" min={1} max={15} value={dailyGoal}
          className="slider-muted"
          onChange={e => { setDailyGoal(e.target.value); save("daily_goal", e.target.value); }}
          style={{ width: "100%" }}
        />
      </Card>

      {/* Уведомления */}
      <SectionHeader label="УВЕДОМЛЕНИЯ" />
      <Card className="!py-0 !px-4">
        <div className="flex items-center justify-between py-3.5" style={{ borderBottom: notif ? "1px solid var(--border)" : "none" }}>
          <span className="text-sm" style={{ color: "var(--text)" }}>Напоминания</span>
          <Switch checked={notif} onCheckedChange={handleNotifToggle} />
        </div>
        {notif && (
          <div className="flex items-center justify-between py-3.5">
            <span className="text-sm" style={{ color: "var(--text)" }}>Время напоминания</span>
            <input
              type="time"
              value={notifTime}
              onChange={e => handleNotifTime(e.target.value)}
              className="text-sm font-semibold rounded-lg px-2 py-1 outline-none"
              style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text)" }}
            />
          </div>
        )}
      </Card>

      {/* Синхронизация */}
      <SectionHeader label="СИНХРОНИЗАЦИЯ" />
      <Card className="!py-0 !px-4">
        <SettingRow left="Создать код синхронизации" right={<ChevronRight size={14} />} onClick={() => setModal("sync-save")} />
        <SettingRow left="Восстановить по коду" right={<ChevronRight size={14} />} onClick={() => setModal("sync-load")} />
      </Card>

      {/* Вопросы */}
      <SectionHeader label="ВОПРОСЫ" />
      <Card className="!py-0 !px-4">
        <style>{`
          @keyframes spin-cycle {
            0%   { transform: rotate(0deg); }
            40%  { transform: rotate(360deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div className="flex items-center justify-between py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm" style={{ color: "var(--text)" }}>Последнее обновление</span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>{questionsUpdatedAt}</span>
          </div>
          <button
            onClick={handleRefreshQuestions}
            disabled={refreshing}
            className="w-8 h-8 flex items-center justify-center rounded-lg"
            style={{ color: refreshing ? "#F97316" : "var(--muted)", background: "var(--bg)" }}
          >
            <RefreshCw
              size={16}
              style={refreshing ? { animation: "spin-cycle 1.4s cubic-bezier(0.4,0,0.6,1) infinite" } : {}}
            />
          </button>
        </div>
      </Card>

      {/* Данные */}
      <SectionHeader label="ДАННЫЕ" />
      <Card className="!py-0 !px-4">
        <SettingRow left="Сбросить весь прогресс" right={null} onClick={() => setModal("reset")} red />
      </Card>

      <p className="text-xs text-center mt-4 pb-4" style={{ color: "var(--muted)" }}>Flux • v{APP_VERSION}</p>
    </div>
  );
}