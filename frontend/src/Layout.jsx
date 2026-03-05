import { useState, useEffect } from "react";
import { createPageUrl } from "@/utils";
import { Link, useLocation } from "react-router-dom";
import { Home, FileText, BarChart2, Settings, Moon, Sun, GraduationCap, Play } from "lucide-react";
import { checkAndUpdateStreak } from "@/utils/storage";

const navItems = [
  { label: "Главная", icon: Home, page: "Dashboard" },
  { label: "Задания", icon: FileText, page: "Tasks" },
  { label: "Теория", icon: GraduationCap, page: "Theory" },
  { label: "Прогресс", icon: BarChart2, page: "Progress" },
  { label: "Ещё", icon: Settings, page: "SettingsPage" },
];

export default function Layout({ children, currentPageName }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [resumePage, setResumePage] = useState(null); // "Tasks" | "Theory" | null

  useEffect(() => {
    checkAndUpdateStreak();
  }, []);

  useEffect(() => {
    const hasTasks  = !!localStorage.getItem("tasks_session");
    const hasTheory = !!localStorage.getItem("theory_session");
    if (hasTasks)        setResumePage("Tasks");
    else if (hasTheory)  setResumePage("Theory");
    else                 setResumePage(null);
  }, [currentPageName]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  const isOnboarding = currentPageName === "Onboarding";
  if (isOnboarding) return <>{children}</>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Inter', sans-serif; }
        :root {
          --accent: #F97316;
          --bg: #F8FAFC;
          --card: #FFFFFF;
          --text: #0F172A;
          --muted: #94A3B8;
          --border: #E2E8F0;
        }
        .dark {
          --bg: #0F172A;
          --card: #1E293B;
          --text: #F1F5F9;
          --muted: #64748B;
          --border: #334155;
        }
        body { background: var(--bg); color: var(--text); transition: background 0.2s, color 0.2s; }
        .border, .border-b, .border-t, .border-l, .border-r { border-color: var(--border); }
      `}</style>

      <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-[390px] flex flex-col min-h-screen relative">

          {/* HEADER */}
          <header
            className="flex items-center justify-between px-4 shrink-0 z-30"
            style={{
              height: 56,
              background: "var(--card)",
              borderBottom: "1px solid var(--border)",
              position: "sticky",
              top: 0,
            }}
          >
            <span className="text-base font-bold" style={{ color: "var(--text)" }}>
              ⚛️ Физика
            </span>
            <div className="flex items-center gap-2">
              {resumePage && (
                <Link
                  to={createPageUrl(resumePage)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors relative"
                  style={{ background: "#FFF7ED", color: "#F97316" }}
                  title="Продолжить тест"
                >
                  <Play size={16} fill="#F97316" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: "#F97316", border: "2px solid var(--card)" }} />
                </Link>
              )}
              <button
                onClick={() => setDark((d) => !d)}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                style={{ background: "var(--bg)", color: "var(--muted)" }}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <Link
                to={createPageUrl("SettingsPage")}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
                style={{ background: "var(--bg)", color: "var(--muted)" }}
              >
                <Settings size={18} />
              </Link>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 80 }}>
            {children}
          </main>

          {/* BOTTOM NAV */}
          <nav
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-30 flex items-center justify-around"
            style={{
              height: 64,
              background: "var(--card)",
              borderTop: "1px solid var(--border)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {navItems.map(({ label, icon: Icon, page }) => {
              const active = currentPageName === page;
              return (
                <Link
                  key={page}
                  to={createPageUrl(page)}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors"
                  style={{ color: active ? "#F97316" : "var(--muted)" }}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}