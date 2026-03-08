import { useState, useEffect, useRef } from "react";
import { createPageUrl } from "@/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, FileText, BarChart2, Settings, Moon, Sun, GraduationCap, ClipboardList, Github } from "lucide-react";
import { checkAndUpdateStreak } from "@/utils/storage";
import { prefetchQuestions } from "@/utils/generateQuestions";

const SESSION_KEYS = ["tasks_session", "theory_session", "exam_session"];

const navItems = [
  { label: "Главная", icon: Home, page: "Dashboard" },
  { label: "Задания", icon: FileText, page: "Tasks" },
  { label: "Теория", icon: GraduationCap, page: "Theory" },
  { label: "Прогресс", icon: BarChart2, page: "Progress" },
  { label: "Ещё", icon: Settings, page: "SettingsPage" },
];

const NAV_PAGES = navItems.map((n) => n.page);

// ── Notification scheduling ───────────────────────────────────────────────
function sendNotifSchedule() {
  if (!("serviceWorker" in navigator)) return;
  const enabled = localStorage.getItem("notif_enabled") === "true";
  const time = localStorage.getItem("notif_time") || "18:00";
  navigator.serviceWorker.ready
    .then((reg) => reg.active?.postMessage({ type: "SCHEDULE_NOTIF", enabled, time }))
    .catch(() => {});
}

export default function Layout({ children, currentPageName }) {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [activeCount, setActiveCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef(null);
  const contentRef = useRef(null); // transform target — NOT the scroll container
  const swipe = useRef({ startX: 0, startY: 0, isHoriz: null, dx: 0 });

  // ── Init ────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAndUpdateStreak();
    prefetchQuestions().catch(() => {});

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => sendNotifSchedule())
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    setActiveCount(SESSION_KEYS.filter((k) => !!localStorage.getItem(k)).length);
  }, [currentPageName]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // ── Swipe navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const sw = swipe.current;

    const content = () => contentRef.current;

    const onTouchStart = (e) => {
      sw.startX = e.touches[0].clientX;
      sw.startY = e.touches[0].clientY;
      sw.isHoriz = null;
      sw.dx = 0;
      if (content()) content().style.transition = "";
    };

    const onTouchMove = (e) => {
      const dx = e.touches[0].clientX - sw.startX;
      const dy = e.touches[0].clientY - sw.startY;

      if (sw.isHoriz === null) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          sw.isHoriz = Math.abs(dx) > Math.abs(dy);
        }
      }

      if (!sw.isHoriz) return;

      const idx = NAV_PAGES.indexOf(currentPageName);
      if (idx === -1) return;

      const canGoNext = idx < NAV_PAGES.length - 1;
      const canGoPrev = idx > 0;

      e.preventDefault();

      if ((dx < 0 && !canGoNext) || (dx > 0 && !canGoPrev)) {
        if (content()) content().style.transform = `translateX(${dx * 0.08}px)`;
        return;
      }

      sw.dx = dx;
      if (content()) content().style.transform = `translateX(${dx * 0.45}px)`;
    };

    const onTouchEnd = () => {
      if (!sw.isHoriz) return;

      const idx = NAV_PAGES.indexOf(currentPageName);

      // Snap content back (nav is never touched)
      if (content()) {
        content().style.transition = "transform 0.22s ease-out";
        content().style.transform = "translateX(0)";
        setTimeout(() => {
          if (content()) { content().style.transition = ""; content().style.transform = ""; }
        }, 220);
      }

      if (idx !== -1) {
        const THRESHOLD = 65;
        if (sw.dx < -THRESHOLD && idx < NAV_PAGES.length - 1) {
          navigate(createPageUrl(NAV_PAGES[idx + 1]), { state: { slideFrom: "right" } });
        } else if (sw.dx > THRESHOLD && idx > 0) {
          navigate(createPageUrl(NAV_PAGES[idx - 1]), { state: { slideFrom: "left" } });
        }
      }

      sw.dx = 0;
      sw.isHoriz = null;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [currentPageName, navigate]);

  // ── Page dots (only for nav pages) ──────────────────────────────────────
  const navIdx = NAV_PAGES.indexOf(currentPageName);
  const slideFrom = location.state?.slideFrom;

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
        input[type="range"] { -webkit-appearance: none; appearance: none; accent-color: #F97316; height: 6px; cursor: pointer; background: transparent; }
        input[type="range"]::-webkit-slider-container { -webkit-appearance: none; }
        input[type="range"]::-webkit-slider-runnable-track { -webkit-appearance: none; border-radius: 3px; height: 6px; background: var(--border); }
        input[type="range"]::-moz-range-track { border-radius: 3px; height: 6px; background: var(--border); }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; background: #F97316; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; margin-top: -7px; box-shadow: 0 1px 4px rgba(249,115,22,0.4); }
        input[type="range"]::-moz-range-thumb { background: #F97316; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; box-shadow: 0 1px 4px rgba(249,115,22,0.4); }
        input[type="range"].slider-muted { accent-color: #94A3B8; }
        input[type="range"].slider-muted::-webkit-slider-thumb { background: #94A3B8; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
        input[type="range"].slider-muted::-moz-range-thumb { background: #94A3B8; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
        .dark input[type="range"].slider-muted { accent-color: #64748B; }
        .dark input[type="range"].slider-muted::-webkit-slider-thumb { background: #64748B; }
        .dark input[type="range"].slider-muted::-moz-range-thumb { background: #64748B; }
        [role="switch"][data-state="unchecked"] { background-color: var(--border) !important; }
        [role="switch"][data-state="checked"] { background-color: #F97316 !important; }

        @keyframes slideInFromRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes slideInFromLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>

      <div className="min-h-screen flex flex-col items-center" style={{ background: "var(--bg)" }}>
        <div className="w-full max-w-[390px] flex flex-col min-h-screen relative">

          {/* HEADER */}
          <header
            className="flex items-center justify-between px-4 shrink-0 z-30 relative"
            style={{
              height: 56,
              background: "var(--card)",
              borderBottom: "1px solid var(--border)",
              position: "sticky",
              top: 0,
            }}
          >
            <a
              href="https://github.com/knyazin47/Flux"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: "var(--bg)", color: "var(--muted)" }}
            >
              <Github size={18} />
            </a>
            <span className="absolute left-1/2 -translate-x-1/2 text-base font-bold" style={{ color: "var(--text)" }}>
              Flux
            </span>
            <div className="flex items-center gap-2">
              <Link
                to={createPageUrl("ActiveSessions")}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors relative"
                style={{ background: activeCount > 0 ? "#FFF7ED" : "var(--bg)", color: activeCount > 0 ? "#F97316" : "var(--muted)" }}
                title="Активные тесты"
              >
                <ClipboardList size={18} />
                {activeCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                    style={{ background: "#F97316", border: "2px solid var(--card)" }}>
                    {activeCount}
                  </span>
                )}
              </Link>
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
          <main ref={mainRef} className="flex-1 overflow-y-auto" style={{ paddingBottom: 80 }}>
            {/* contentRef: persistent transform target — keeps nav fixed unaffected */}
            <div ref={contentRef}>
              <div
                key={location.pathname}
                style={{
                  animation: slideFrom === "right"
                    ? "slideInFromRight 0.25s ease-out"
                    : slideFrom === "left"
                    ? "slideInFromLeft 0.25s ease-out"
                    : undefined,
                }}
              >
                {children}
              </div>
            </div>
          </main>

          {/* BOTTOM NAV */}
          <nav
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-30 flex flex-col"
            style={{
              background: "var(--card)",
              borderTop: "1px solid var(--border)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Page position dots */}
            {navIdx !== -1 && (
              <div className="flex justify-center gap-1.5 pt-2 pb-0.5">
                {NAV_PAGES.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === navIdx ? 16 : 5,
                      height: 5,
                      background: i === navIdx ? "#F97316" : "var(--border)",
                    }}
                  />
                ))}
              </div>
            )}
            <div className="flex items-center justify-around" style={{ height: navIdx !== -1 ? 52 : 64 }}>
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
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
