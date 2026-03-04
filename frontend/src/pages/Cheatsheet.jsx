import { useState } from "react";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";
import formulasData from "../../../data/formulas.json";
import { lsGet, lsSet } from "@/utils/storage";

// ── Построить карту тема → формулы из formulas.json ──────────────────────
const FORMULAS = {};
for (const topic of formulasData.topics) {
  FORMULAS[topic.name] = topic.formulas.map((f) => ({
    id:       f.id,
    name:     f.name,
    formula:  f.formula,
    latex:    f.latex || null,
    units:    f.units || "",
    subtopic: f.subtopic || "",
  }));
}
const ALL_TOPICS = Object.keys(FORMULAS);
const ALL_FORMULAS = ALL_TOPICS.flatMap((t) => FORMULAS[t]);

// ── KaTeX ─────────────────────────────────────────────────────────────────
function TeX({ formula }) {
  const html = katex.renderToString(formula, { throwOnError: false, displayMode: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ── Подсветка поиска ──────────────────────────────────────────────────────
function highlight(text, query) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: "#F97316", fontWeight: 700 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Карточка одной формулы ────────────────────────────────────────────────
function FormulaRow({ f, starred, onStar, query }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold mb-1.5" style={{ color: "var(--text)" }}>
          {highlight(f.name, query)}
        </p>
        {f.subtopic && (
          <p className="text-xs mb-1.5" style={{ color: "var(--muted)" }}>{f.subtopic}</p>
        )}
        <div className="py-2 px-3 rounded-xl text-center mb-1 overflow-x-auto" style={{ background: "#FFF7ED" }}>
          {f.latex
            ? <TeX formula={f.latex} />
            : <span className="font-mono text-base font-bold" style={{ color: "#F97316" }}>{highlight(f.formula, query)}</span>
          }
        </div>
        {f.units && <p className="text-xs" style={{ color: "var(--muted)" }}>{f.units}</p>}
      </div>
      <button onClick={() => onStar(f.id)} className="mt-1 p-1 shrink-0">
        <Star size={18} fill={starred ? "#F97316" : "none"} stroke={starred ? "#F97316" : "var(--muted)"} />
      </button>
    </div>
  );
}

// ── Основной компонент ────────────────────────────────────────────────────
export default function Cheatsheet() {
  const [activeTab,   setActiveTab]   = useState("topics");
  const [openTopics,  setOpenTopics]  = useState({ [ALL_TOPICS[0]]: true });
  const [search,      setSearch]      = useState("");
  const [starredOpen, setStarredOpen] = useState(false);
  const [starred, setStarred] = useState(() => lsGet("starred_formulas", []));

  const toggleStar = (id) => {
    const next = starred.includes(id) ? starred.filter((s) => s !== id) : [...starred, id];
    setStarred(next);
    lsSet("starred_formulas", next);
  };

  const toggleTopic = (t) => setOpenTopics((p) => ({ ...p, [t]: !p[t] }));

  const starredFormulas = ALL_FORMULAS.filter((f) => starred.includes(f.id));

  const searchResults = search.length > 1
    ? ALL_FORMULAS.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.formula.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const tabs = [
    { id: "topics", label: "По темам" },
    { id: "hard",   label: `⭐ Сложные (${starredFormulas.length})` },
  ];

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-bold pt-2" style={{ color: "var(--text)" }}>Шпаргалка</h1>

      {/* Поиск */}
      <div className="relative">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Поиск формулы..."
          className="w-full px-4 py-3 rounded-2xl text-sm outline-none"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
        />
      </div>

      {/* Вкладки */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 text-xs font-semibold transition-colors relative"
            style={{ color: activeTab === tab.id ? "#F97316" : "var(--muted)" }}>
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#F97316" }} />
            )}
          </button>
        ))}
      </div>

      {/* Результаты поиска */}
      {searchResults !== null ? (
        <div>
          <p className="text-xs mb-3" style={{ color: "var(--muted)" }}>
            {searchResults.length} {searchResults.length === 1 ? "результат" : "результатов"}
          </p>
          {searchResults.length === 0
            ? <p className="text-sm text-center py-8" style={{ color: "var(--muted)" }}>Ничего не найдено</p>
            : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "0 16px" }}>
                {searchResults.map((f) => (
                  <FormulaRow key={f.id} f={f} starred={starred.includes(f.id)} onStar={toggleStar} query={search} />
                ))}
              </div>
            )
          }
        </div>

      ) : activeTab === "topics" ? (
        <div className="flex flex-col gap-3">
          {/* Секция «Сложные» */}
          <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #F97316", background: "var(--card)" }}>
            <button onClick={() => setStarredOpen((o) => !o)} className="w-full flex items-center gap-3 p-4">
              <span className="text-lg">⭐</span>
              <span className="flex-1 text-sm font-semibold text-left" style={{ color: "var(--text)" }}>Сложные формулы</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#F97316" }}>
                {starredFormulas.length}
              </span>
              {starredOpen ? <ChevronUp size={16} style={{ color: "var(--muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--muted)" }} />}
            </button>
            {starredOpen && (
              <div className="px-4 pb-3">
                {starredFormulas.length === 0
                  ? <p className="text-xs py-2 text-center" style={{ color: "var(--muted)" }}>Нажми ⭐ у формулы чтобы добавить</p>
                  : starredFormulas.map((f) => <FormulaRow key={f.id} f={f} starred={true} onStar={toggleStar} query="" />)
                }
              </div>
            )}
          </div>

          {/* Темы — аккордеон */}
          {ALL_TOPICS.map((topic) => (
            <div key={topic} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)" }}>
              <button onClick={() => toggleTopic(topic)} className="w-full flex items-center justify-between p-4">
                <div>
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{topic}</span>
                  <span className="text-xs ml-2" style={{ color: "var(--muted)" }}>{FORMULAS[topic].length} формул</span>
                </div>
                {openTopics[topic]
                  ? <ChevronUp size={16} style={{ color: "var(--muted)" }} />
                  : <ChevronDown size={16} style={{ color: "var(--muted)" }} />
                }
              </button>
              {openTopics[topic] && (
                <div className="px-4 pb-2">
                  {FORMULAS[topic].map((f) => (
                    <FormulaRow key={f.id} f={f} starred={starred.includes(f.id)} onStar={toggleStar} query="" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

      ) : (
        // Вкладка «⭐ Сложные»
        <div className="flex flex-col gap-3">
          {starredFormulas.length === 0
            ? <p className="text-sm text-center py-12" style={{ color: "var(--muted)" }}>
                Нажми ⭐ рядом с формулой в разделе «По темам»
              </p>
            : (
              <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--card)", padding: "0 16px" }}>
                {starredFormulas.map((f) => (
                  <FormulaRow key={f.id} f={f} starred={true} onStar={toggleStar} query="" />
                ))}
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
