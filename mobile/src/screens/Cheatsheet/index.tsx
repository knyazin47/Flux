import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { lsGet, lsSet } from "@/utils/storage";
import formulasData from "@/data/formulas.json";
import type { CheatsheetProps } from "@/navigation/types";

// ── data ──────────────────────────────────────────────────────────────────────

type Formula = {
  id: string;
  name: string;
  formula: string;
  units: string;
  subtopic: string;
};

const FORMULAS: Record<string, Formula[]> = {};
for (const topic of (formulasData as { topics: Array<{ name: string; formulas: Array<{ id: string; name: string; formula: string; units?: string; subtopic?: string }> }> }).topics) {
  FORMULAS[topic.name] = topic.formulas.map((f) => ({
    id:       f.id,
    name:     f.name,
    formula:  f.formula,
    units:    f.units    || "",
    subtopic: f.subtopic || "",
  }));
}
const ALL_TOPICS = Object.keys(FORMULAS);
const ALL_FORMULAS = ALL_TOPICS.flatMap((t) => FORMULAS[t]);

// ── formula row ───────────────────────────────────────────────────────────────

function FormulaRow({
  f, starred, onStar, query,
}: { f: Formula; starred: boolean; onStar: (id: string) => void; query: string }) {
  const { theme } = useTheme();
  const highlight = (text: string) => {
    if (!query) return <Text style={{ color: theme.text }}>{text}</Text>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <Text style={{ color: theme.text }}>{text}</Text>;
    return (
      <Text style={{ color: theme.text }}>
        {text.slice(0, idx)}
        <Text style={{ color: "#F97316", fontWeight: "700" }}>{text.slice(idx, idx + query.length)}</Text>
        {text.slice(idx + query.length)}
      </Text>
    );
  };

  return (
    <View style={[s.fRow, { borderColor: theme.border }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>{highlight(f.name)}</Text>
        {f.subtopic ? <Text style={{ fontSize: 11, color: theme.muted }}>{f.subtopic}</Text> : null}
        <View style={{ backgroundColor: "#FFF7ED", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignItems: "center" }}>
          <Text style={{ fontFamily: "monospace", fontSize: 15, fontWeight: "700", color: "#F97316" }}>
            {highlight(f.formula)}
          </Text>
        </View>
        {f.units ? <Text style={{ fontSize: 11, color: theme.muted }}>{f.units}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onStar(f.id)} style={{ padding: 4, alignSelf: "flex-start" }}>
        <Ionicons
          name={starred ? "star" : "star-outline"}
          size={18}
          color={starred ? "#F97316" : theme.muted}
        />
      </TouchableOpacity>
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function CheatsheetScreen(_props: CheatsheetProps) {
  const { theme } = useTheme();

  const [activeTab,   setActiveTab]   = useState<"topics" | "hard">("topics");
  const [openTopics,  setOpenTopics]  = useState<Record<string, boolean>>({ [ALL_TOPICS[0]]: true });
  const [search,      setSearch]      = useState("");
  const [starredOpen, setStarredOpen] = useState(false);
  const [starred, setStarred] = useState<string[]>(() => (lsGet("starred_formulas", []) as string[]));

  const toggleStar = (id: string) => {
    const next = starred.includes(id) ? starred.filter((s) => s !== id) : [...starred, id];
    setStarred(next);
    lsSet("starred_formulas", next);
  };

  const toggleTopic = (t: string) => setOpenTopics((p) => ({ ...p, [t]: !p[t] }));

  const starredFormulas = ALL_FORMULAS.filter((f) => starred.includes(f.id));

  const searchResults = search.length > 1
    ? ALL_FORMULAS.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.formula.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const tabs = [
    { id: "topics" as const, label: "По темам" },
    { id: "hard"   as const, label: `Сложные (${starredFormulas.length})` },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <View style={{ padding: 16, gap: 12 }}>

          {/* Search */}
          <View style={[s.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={16} color={theme.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Поиск формулы..."
              placeholderTextColor={theme.muted}
              style={{ flex: 1, fontSize: 14, color: theme.text, paddingVertical: 0 }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color={theme.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Tabs */}
          <View style={[s.tabRow, { borderColor: theme.border }]}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)}
                style={[s.tab, activeTab === tab.id && { borderBottomColor: "#F97316", borderBottomWidth: 2 }]}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: activeTab === tab.id ? "#F97316" : theme.muted }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search results */}
          {searchResults !== null ? (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 11, color: theme.muted }}>
                {searchResults.length} {searchResults.length === 1 ? "результат" : "результатов"}
              </Text>
              {searchResults.length === 0 ? (
                <Text style={{ fontSize: 13, color: theme.muted, textAlign: "center", paddingVertical: 32 }}>Ничего не найдено</Text>
              ) : (
                <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {searchResults.map((f) => (
                    <FormulaRow key={f.id} f={f} starred={starred.includes(f.id)} onStar={toggleStar} query={search} />
                  ))}
                </View>
              )}
            </View>

          ) : activeTab === "topics" ? (
            <View style={{ gap: 10 }}>
              {/* Starred section */}
              <View style={[s.card, { backgroundColor: theme.card, borderColor: "#F97316", borderWidth: 2 }]}>
                <TouchableOpacity onPress={() => setStarredOpen((o) => !o)} style={s.accordionHeader}>
                  <Ionicons name="star" size={18} color="#F97316" />
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: theme.text }}>Сложные формулы</Text>
                  <View style={{ backgroundColor: "#F97316", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{starredFormulas.length}</Text>
                  </View>
                  <Ionicons name={starredOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.muted} />
                </TouchableOpacity>
                {starredOpen && (
                  <View style={{ paddingBottom: 4 }}>
                    {starredFormulas.length === 0 ? (
                      <Text style={{ fontSize: 12, color: theme.muted, textAlign: "center", paddingVertical: 12 }}>
                        Нажми звёздочку у формулы чтобы добавить
                      </Text>
                    ) : (
                      starredFormulas.map((f) => (
                        <FormulaRow key={f.id} f={f} starred={true} onStar={toggleStar} query="" />
                      ))
                    )}
                  </View>
                )}
              </View>

              {/* Topic accordions */}
              {ALL_TOPICS.map((topic) => (
                <View key={topic} style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <TouchableOpacity onPress={() => toggleTopic(topic)} style={s.accordionHeader}>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: theme.text }}>{topic}</Text>
                    <Text style={{ fontSize: 11, color: theme.muted, marginRight: 6 }}>
                      {FORMULAS[topic].length} формул
                    </Text>
                    <Ionicons name={openTopics[topic] ? "chevron-up" : "chevron-down"} size={16} color={theme.muted} />
                  </TouchableOpacity>
                  {openTopics[topic] && (
                    <View style={{ paddingBottom: 4 }}>
                      {FORMULAS[topic].map((f) => (
                        <FormulaRow key={f.id} f={f} starred={starred.includes(f.id)} onStar={toggleStar} query="" />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

          ) : (
            // Hard tab
            <View style={{ gap: 10 }}>
              {starredFormulas.length === 0 ? (
                <Text style={{ fontSize: 13, color: theme.muted, textAlign: "center", paddingVertical: 48 }}>
                  Нажми звёздочку рядом с формулой в разделе «По темам»
                </Text>
              ) : (
                <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {starredFormulas.map((f) => (
                    <FormulaRow key={f.id} f={f} starred={true} onStar={toggleStar} query="" />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  searchBox:     { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  tabRow:        { flexDirection: "row", borderBottomWidth: 1 },
  tab:           { flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  card:          { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  accordionHeader:{ flexDirection: "row", alignItems: "center", gap: 8, padding: 14 },
  fRow:          { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 2 },
});
