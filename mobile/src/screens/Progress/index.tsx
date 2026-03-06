import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  TextInput, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { lsGet, lsSet } from "@/utils/storage";
import type { ProgressHomeProps } from "@/navigation/types";

const TOPICS = [
  "Механика", "Молекулярная физика", "Термодинамика",
  "Электростатика", "Постоянный ток", "Электромагнетизм",
  "Колебания и волны", "Оптика", "Квантовая и ядерная физика",
];

const TABS = ["Статистика", "Темы", "РТ/ДРТ", "Достижения"] as const;
type Tab = typeof TABS[number];

const ACHIEVEMENTS_DEF = [
  { id: "first_task",  emoji: "🚀", name: "Старт",    desc: "Первое задание" },
  { id: "streak_7",    emoji: "🔥", name: "Неделя",   desc: "Стрик 7 дней" },
  { id: "answers_100", emoji: "💯", name: "Сотня",    desc: "100 верных ответов" },
  { id: "all_topics",  emoji: "📚", name: "Все темы", desc: "Все 9 тем" },
  { id: "perfect",     emoji: "🎯", name: "Отличник", desc: "100% в тесте" },
];

function barColor(pct: number) {
  return pct >= 70 ? "#22C55E" : pct >= 50 ? "#EAB308" : pct >= 30 ? "#F97316" : "#EF4444";
}

function loadTopicStats() {
  const raw = lsGet("topic_stats", {}) as Record<string, { correct: number; total: number }>;
  return TOPICS.map(name => {
    const s = raw[name];
    const pct = s?.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
    return { name, pct };
  }).sort((a, b) => a.pct - b.pct);
}

type RtResult = { date?: string; type?: string; score: number; notes?: string };

function AddResultModal({ onClose, onSave }: { onClose: () => void; onSave: (r: RtResult) => void }) {
  const { theme } = useTheme();
  const [date,  setDate]  = useState(new Date().toISOString().slice(0, 10));
  const [type,  setType]  = useState("РТ");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const inp = { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: theme.text, fontSize: 14 };

  return (
    <Modal visible transparent animationType="slide">
      <View style={p.overlay}>
        <View style={[p.sheet, { backgroundColor: theme.card }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.text }}>Добавить результат</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ color: theme.muted, fontSize: 20 }}>✕</Text></TouchableOpacity>
          </View>
          <TextInput value={date} onChangeText={setDate} style={inp} placeholder="ГГГГ-ММ-ДД" placeholderTextColor={theme.muted} />
          <View style={{ flexDirection: "row", gap: 6, marginVertical: 8 }}>
            {["ЦТ", "ЦЭ", "РТ", "ДРТ", "Другое"].map(t => (
              <TouchableOpacity key={t} onPress={() => setType(t)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
                backgroundColor: type === t ? "#F97316" : theme.bg, borderWidth: 1, borderColor: type === t ? "#F97316" : theme.border }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: type === t ? "#fff" : theme.muted }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput value={score} onChangeText={setScore} keyboardType="numeric" style={inp} placeholder="Балл (0-100)" placeholderTextColor={theme.muted} />
          <TextInput value={notes} onChangeText={setNotes} style={[inp, { marginTop: 8 }]} placeholder="Заметки" placeholderTextColor={theme.muted} />
          <TouchableOpacity style={[p.btn, { marginTop: 14 }]}
            onPress={() => { if (!score) return; onSave({ date, type, score: parseInt(score), notes }); onClose(); }}>
            <Text style={p.btnText}>Сохранить</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function ProgressScreen(_props: ProgressHomeProps) {
  const { theme } = useTheme();
  const [tab, setTab]     = useState<Tab>("Статистика");
  const [showModal, setM] = useState(false);
  const [rtResults, setRt] = useState<RtResult[]>(() => lsGet("rt_results", []) as RtResult[]);

  const topicStats   = loadTopicStats();
  const topicRaw     = lsGet("topic_stats", {}) as Record<string, { correct: number; total: number }>;
  const totalXP      = Number(lsGet("xp_total", 0));
  const streak       = Number(lsGet("streak_days", 0));
  const totalAnswers = Object.values(topicRaw).reduce((s, t) => s + (t.total || 0), 0);
  const totalCorrect = Object.values(topicRaw).reduce((s, t) => s + (t.correct || 0), 0);
  const accuracy     = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  const activity     = lsGet("activity_history", Array(30).fill(0)) as number[];
  const maxBar       = Math.max(...activity, 1);
  const unlockedIds  = new Set((lsGet("achievements", []) as Array<{ id: string }>).map(a => a.id));

  const saveResult = (r: RtResult) => {
    const next = [r, ...rtResults]; setRt(next); lsSet("rt_results", next);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {showModal && <AddResultModal onClose={() => setM(false)} onSave={saveResult} />}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
        <Text style={[p.h1, { color: theme.text }]}>Прогресс</Text>

        {/* Tab bar */}
        <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: theme.border }}>
          {TABS.map(t => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, paddingVertical: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 10, fontWeight: "600", color: tab === t ? "#F97316" : theme.muted }}>{t}</Text>
              {tab === t && <View style={{ position: "absolute", bottom: 0, left: 4, right: 4, height: 2, backgroundColor: "#F97316", borderRadius: 1 }} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Статистика */}
        {tab === "Статистика" && <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              { icon: "⚡", val: String(totalXP),    label: "Всего XP" },
              { icon: "🔥", val: String(streak),      label: "Текущий стрик" },
              { icon: "📝", val: String(totalAnswers), label: "Ответов дано" },
              { icon: "✓",  val: `${accuracy}%`,      label: "Верных ответов" },
            ].map(s => (
              <View key={s.label} style={{ width: "47%", backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 14, gap: 4 }}>
                <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: theme.text }}>{s.val}</Text>
                <Text style={{ fontSize: 11, color: theme.muted }}>{s.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
            <Text style={{ fontWeight: "700", color: theme.text, marginBottom: 12 }}>Активность за 30 дней</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", height: 56, gap: 1 }}>
              {activity.map((v, i) => (
                <View key={i} style={{ flex: 1, height: Math.max(2, (v / maxBar) * 52), borderRadius: 2, backgroundColor: v > 0 ? "#F97316" : theme.border }} />
              ))}
            </View>
          </View>
        </>}

        {/* Темы */}
        {tab === "Темы" && (
          <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 14 }}>
            <Text style={{ fontWeight: "700", color: theme.text }}>Знание по темам</Text>
            {topicStats.map(t => (
              <View key={t.name}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                  <Text style={{ fontSize: 12, color: theme.text }}>{t.name}</Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: barColor(t.pct) }}>{t.pct}%</Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border }}>
                  <View style={{ width: `${t.pct}%`, height: 6, borderRadius: 3, backgroundColor: barColor(t.pct) }} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* РТ/ДРТ */}
        {tab === "РТ/ДРТ" && <>
          <View style={{ borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", backgroundColor: theme.border, paddingHorizontal: 12, paddingVertical: 8 }}>
              {["Дата", "Тип", "Балл", "Заметки"].map(h => (
                <Text key={h} style={{ flex: 1, fontSize: 11, fontWeight: "700", color: theme.muted }}>{h}</Text>
              ))}
            </View>
            {rtResults.length === 0 && <Text style={{ textAlign: "center", color: theme.muted, padding: 24 }}>Нет результатов</Text>}
            {rtResults.map((r, i) => (
              <View key={i} style={{ flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: i % 2 === 0 ? theme.card : theme.bg }}>
                <Text style={{ flex: 1, fontSize: 12, color: theme.text }}>{r.date?.slice(5) ?? ""}</Text>
                <Text style={{ flex: 1, fontSize: 12, color: theme.text }}>{r.type ?? ""}</Text>
                <Text style={{ flex: 1, fontSize: 12, fontWeight: "700", color: theme.text }}>{r.score}</Text>
                <Text style={{ flex: 1, fontSize: 12, color: theme.muted }} numberOfLines={1}>{r.notes || "—"}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={p.btn} onPress={() => setM(true)}>
            <Text style={p.btnText}>+ Добавить результат</Text>
          </TouchableOpacity>
        </>}

        {/* Достижения */}
        {tab === "Достижения" && <>
          <Text style={{ fontWeight: "700", color: theme.text }}>Достижения</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {ACHIEVEMENTS_DEF.map(a => {
              const ok = unlockedIds.has(a.id);
              return (
                <View key={a.id} style={{ width: "30%", backgroundColor: theme.card, borderRadius: 14, borderWidth: 1,
                  borderColor: ok ? "#F97316" : theme.border, padding: 10, alignItems: "center", gap: 4, opacity: ok ? 1 : 0.55 }}>
                  {ok && <View style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: 7,
                    backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#fff", fontSize: 8 }}>✓</Text>
                  </View>}
                  <Text style={{ fontSize: 24 }}>{ok ? a.emoji : "🔒"}</Text>
                  <Text style={{ fontSize: 10, fontWeight: "700", textAlign: "center", color: ok ? theme.text : theme.muted }}>{a.name}</Text>
                  <Text style={{ fontSize: 9, textAlign: "center", color: theme.muted }}>{a.desc}</Text>
                </View>
              );
            })}
          </View>
        </>}

      </ScrollView>
    </SafeAreaView>
  );
}

const p = StyleSheet.create({
  h1:      { fontSize: 20, fontWeight: "800", paddingTop: 8 },
  btn:     { backgroundColor: "#F97316", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
});
