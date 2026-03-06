import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { lsGet, lsSet } from "@/utils/storage";
import formulasData from "@/data/formulas.json";
import type { FormulasHomeProps } from "@/navigation/types";

// ── types ─────────────────────────────────────────────────────────────────────

type Formula = {
  id: string;
  name: string;
  formula: string;
  latex: string | null;
  units: string;
  note: string;
};

type RatingId = "know" | "hard" | "dontknow";

// ── data ──────────────────────────────────────────────────────────────────────

const FORMULAS_BY_TOPIC: Record<string, Formula[]> = {};
for (const topic of (formulasData as { topics: Array<{ name: string; formulas: Array<{ id: string; name: string; formula: string; latex?: string; units?: string; subtopic?: string }> }> }).topics) {
  FORMULAS_BY_TOPIC[topic.name] = topic.formulas.map(f => ({
    id:      f.id,
    name:    f.name,
    formula: f.formula,
    latex:   f.latex || null,
    units:   f.units || "",
    note:    f.subtopic || "",
  }));
}
const ALL_TOPICS   = Object.keys(FORMULAS_BY_TOPIC);
const ALL_FORMULAS = ALL_TOPICS.flatMap(t => FORMULAS_BY_TOPIC[t]);

// ── SM-2 helpers ──────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10);
}

type ProgressEntry = { status: RatingId; interval: number; nextReview: string; lastRated: string };

function saveRating(id: string, rating: RatingId) {
  const progress = lsGet("formula_progress", {}) as Record<string, ProgressEntry>;
  const cur = progress[id] || { interval: 1 };
  const today = todayStr();
  const interval = rating === "know" ? Math.round((cur.interval || 1) * 2.5)
                 : rating === "hard" ? Math.max(1, cur.interval || 1) : 1;
  progress[id] = { status: rating, interval, nextReview: addDays(today, interval), lastRated: today };
  lsSet("formula_progress", progress); // fire-and-forget
}

function getDueFormulas(): Formula[] {
  const progress = lsGet("formula_progress", {}) as Record<string, ProgressEntry>;
  const today = todayStr();
  return ALL_FORMULAS.filter(f => { const p = progress[f.id]; return !p || p.nextReview <= today; });
}

function getTopicProgress() {
  const progress = lsGet("formula_progress", {}) as Record<string, ProgressEntry>;
  return ALL_TOPICS.map(t => {
    const fs = FORMULAS_BY_TOPIC[t];
    return { name: t, total: fs.length, done: fs.filter(f => progress[f.id]?.status === "know").length };
  });
}

// ── FlipCard ──────────────────────────────────────────────────────────────────

function FlipCard({
  formula, starred, onStar, onRate, index, total,
}: {
  formula: Formula; starred: boolean; onStar: (id: string) => void;
  onRate: (r: RatingId) => void; index: number; total: number;
}) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const frontRot = anim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRot  = anim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  const flip = () => {
    const toVal = flipped ? 0 : 1;
    Animated.timing(anim, { toValue: toVal, duration: 400, useNativeDriver: true }).start();
    setFlipped(f => !f);
  };

  const handleSwipe = (dx: number) => {
    if (!flipped) return; // only rate after seeing formula
    onRate(dx > 0 ? "know" : "dontknow");
  };

  const startX = useRef(0);

  return (
    <View style={{ alignItems: "center", gap: 12, paddingHorizontal: 16 }}>
      {/* Card wrapper — captures swipe */}
      <Pressable
        style={{ width: "100%", height: 220 }}
        onPress={flip}
        onTouchStart={e => { startX.current = e.nativeEvent.pageX; }}
        onTouchEnd={e => {
          const dx = e.nativeEvent.pageX - startX.current;
          if (Math.abs(dx) > 60) handleSwipe(dx);
        }}
      >
        {/* Front */}
        <Animated.View style={[s.cardFace, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ rotateY: frontRot }] }]}>
          <Text style={[s.cardName, { color: theme.text }]}>{formula.name}</Text>
          <Text style={{ fontSize: 12, color: theme.muted, marginTop: 8 }}>Нажми чтобы увидеть формулу</Text>
        </Animated.View>

        {/* Back */}
        <Animated.View style={[s.cardFace, s.cardBack, { backgroundColor: theme.card, transform: [{ rotateY: backRot }] }]}>
          <TouchableOpacity style={s.starBtn} onPress={() => onStar(formula.id)}>
            <Text style={{ fontSize: 20, color: starred ? "#F97316" : theme.muted }}>{starred ? "★" : "☆"}</Text>
          </TouchableOpacity>
          <View style={{ backgroundColor: "#FFF7ED", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 6 }}>
            <Text style={{ fontFamily: "monospace", fontSize: 18, color: "#F97316", textAlign: "center" }}>{formula.formula}</Text>
          </View>
          {!!formula.units && <Text style={{ fontSize: 12, color: theme.muted }}>{formula.units}</Text>}
          {!!formula.note  && <Text style={{ fontSize: 11, color: "#6B7280", textAlign: "center" }}>{formula.note}</Text>}
        </Animated.View>
      </Pressable>

      <Text style={{ fontSize: 11, color: theme.muted }}>Карточка {index + 1} / {total}</Text>

      {/* Rating buttons — visible only after flip */}
      {flipped && (
        <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
          {([
            { id: "dontknow" as RatingId, label: "Не знаю", bg: "#FEF2F2", fg: "#EF4444" },
            { id: "hard"     as RatingId, label: "Сложно",  bg: "#FEFCE8", fg: "#CA8A04" },
            { id: "know"     as RatingId, label: "Знаю",    bg: "#F0FDF4", fg: "#16A34A" },
          ] as const).map(r => (
            <TouchableOpacity key={r.id} onPress={() => onRate(r.id)}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: r.bg, alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: r.fg }}>{r.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── SummaryScreen ─────────────────────────────────────────────────────────────

function SummaryScreen({ ratings, total, onRestart }: { ratings: RatingId[]; total: number; onRestart: () => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ padding: 24, gap: 16, alignItems: "center" }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: theme.text }}>Сессия завершена!</Text>
      {([
        { id: "know"     as RatingId, label: "Знаю",    bg: "#F0FDF4", fg: "#16A34A" },
        { id: "hard"     as RatingId, label: "Сложно",  bg: "#FEFCE8", fg: "#CA8A04" },
        { id: "dontknow" as RatingId, label: "Не знаю", bg: "#FEF2F2", fg: "#EF4444" },
      ] as const).map(r => (
        <View key={r.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          backgroundColor: r.bg, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, width: "100%" }}>
          <Text style={{ fontWeight: "600", color: r.fg }}>{r.label}</Text>
          <Text style={{ fontSize: 18, fontWeight: "800", color: r.fg }}>{ratings.filter(x => x === r.id).length} / {total}</Text>
        </View>
      ))}
      <TouchableOpacity style={[s.btn, { width: "100%" }]} onPress={onRestart}>
        <Text style={s.btnText}>Повторить →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function FormulaCardsScreen(_props: FormulasHomeProps) {
  const { theme } = useTheme();
  const [tab, setTab]               = useState<"topics" | "review" | "hard">("topics");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [cardIndex, setCardIndex]   = useState(0);
  const [ratings, setRatings]       = useState<RatingId[]>([]);
  const [finished, setFinished]     = useState(false);
  const [starred, setStarred]       = useState<string[]>(() => lsGet("starred_formulas", []) as string[]);

  const toggleStar = (id: string) => {
    const next = starred.includes(id) ? starred.filter(s => s !== id) : [...starred, id];
    setStarred(next);
    lsSet("starred_formulas", next);
  };

  const dueFormulas     = getDueFormulas();
  const starredFormulas = ALL_FORMULAS.filter(f => starred.includes(f.id));
  const topicProgress   = getTopicProgress();

  const startTopic = (topic: string) => {
    setActiveTopic(topic); setCardIndex(0); setRatings([]); setFinished(false);
  };

  const getCards = (): Formula[] => {
    if (activeTopic === "_due")     return dueFormulas;
    if (activeTopic === "_starred") return starredFormulas;
    return activeTopic ? FORMULAS_BY_TOPIC[activeTopic] || [] : [];
  };

  const handleRate = (rating: RatingId) => {
    const cards = getCards();
    saveRating(cards[cardIndex].id, rating);
    const newRatings = [...ratings, rating];
    setRatings(newRatings);
    if (cardIndex + 1 >= cards.length) setFinished(true);
    else setCardIndex(i => i + 1);
  };

  // ── Card session view ──────────────────────────────────────────────────────
  if (activeTopic) {
    const cards = getCards();
    const topicLabel = activeTopic === "_due" ? "Повторение" : activeTopic === "_starred" ? "Сложные" : activeTopic;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 }}>
          <TouchableOpacity onPress={() => setActiveTopic(null)}>
            <Text style={{ fontSize: 14, color: theme.text, fontWeight: "600" }}>← {topicLabel}</Text>
          </TouchableOpacity>
          {!finished && <Text style={{ fontSize: 12, color: theme.muted }}>{cardIndex + 1} / {cards.length}</Text>}
        </View>

        {finished ? (
          <SummaryScreen ratings={ratings} total={cards.length} onRestart={() => { setCardIndex(0); setRatings([]); setFinished(false); }} />
        ) : cards[cardIndex] ? (
          <FlipCard
            key={cardIndex}
            formula={cards[cardIndex]}
            starred={starred.includes(cards[cardIndex].id)}
            onStar={toggleStar}
            onRate={handleRate}
            index={cardIndex}
            total={cards.length}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  // ── Topic list view ────────────────────────────────────────────────────────
  const tabs = [
    { id: "topics" as const,  label: "По темам" },
    { id: "review" as const,  label: `Повторение${dueFormulas.length > 0 ? ` (${dueFormulas.length})` : ""}` },
    { id: "hard"   as const,  label: `Сложные${starredFormulas.length > 0 ? ` (${starredFormulas.length})` : ""}` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Text style={[s.h1, { color: theme.text }]}>Карточки формул</Text>

        {/* Tabs */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.border }}>
          {tabs.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
              style={{ flex: 1, paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: tab === t.id ? "#F97316" : theme.muted }}>{t.label}</Text>
              {tab === t.id && <View style={{ position: "absolute", bottom: 0, left: 8, right: 8, height: 2, backgroundColor: "#F97316", borderRadius: 1 }} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Topics tab */}
        {tab === "topics" && topicProgress.map(t => (
          <TouchableOpacity key={t.name} onPress={() => startTopic(t.name)}
            style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>{t.name}</Text>
              <Text style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{t.done} / {t.total} знаю</Text>
              <View style={{ marginTop: 6, height: 4, borderRadius: 2, backgroundColor: theme.border }}>
                <View style={{ width: `${t.total > 0 ? (t.done / t.total) * 100 : 0}%`, height: 4, borderRadius: 2, backgroundColor: "#F97316" }} />
              </View>
            </View>
            <Text style={{ color: theme.muted, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Review tab */}
        {tab === "review" && (
          dueFormulas.length === 0
            ? <Text style={{ color: theme.muted, textAlign: "center", paddingVertical: 32 }}>Все формулы повторены! Загляни завтра.</Text>
            : <>
                <View style={{ backgroundColor: "#F97316", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" }}>
                  <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{dueFormulas.length} карточек на сегодня</Text>
                </View>
                <TouchableOpacity style={s.btn} onPress={() => startTopic("_due")}>
                  <Text style={s.btnText}>Начать повторение →</Text>
                </TouchableOpacity>
              </>
        )}

        {/* Hard tab */}
        {tab === "hard" && (
          starredFormulas.length === 0
            ? <Text style={{ color: theme.muted, textAlign: "center", paddingVertical: 32 }}>Отметь формулы звёздочкой ★ на обратной стороне карточки</Text>
            : <>
                <Text style={{ fontSize: 12, color: theme.muted }}>{starredFormulas.length} сложных формул</Text>
                <TouchableOpacity style={s.btn} onPress={() => startTopic("_starred")}>
                  <Text style={s.btnText}>Повторить сложные →</Text>
                </TouchableOpacity>
              </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  h1:      { fontSize: 20, fontWeight: "800", paddingTop: 8 },
  btn:     { backgroundColor: "#F97316", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cardFace: {
    position: "absolute", inset: 0, borderRadius: 16, borderWidth: 1,
    alignItems: "center", justifyContent: "center", padding: 20,
    backfaceVisibility: "hidden",
  },
  cardBack: { borderColor: "#F97316", borderWidth: 2 },
  cardName: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  starBtn:  { position: "absolute", top: 12, right: 12 },
});
