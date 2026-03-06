import React, { useMemo, useRef, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { lsGet } from "@/utils/storage";
import { FlameIcon } from "@/components/FlameIcon";
import type { DashboardHomeProps } from "@/navigation/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function getDaysLeft(dateStr: string): number | null {
  if (!dateStr) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000);
}

function daysWord(n: number | null): string {
  if (n === null) return "";
  const abs = Math.abs(n);
  if (abs % 10 === 1 && abs % 100 !== 11) return "день";
  if (abs % 10 >= 2 && abs % 10 <= 4 && (abs % 100 < 10 || abs % 100 >= 20)) return "дня";
  return "дней";
}

function formatDate(str: string): string {
  if (!str) return "";
  return new Date(str).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

const LEVELS = [
  { name: "Физик",    min: 0,    max: 200  },
  { name: "Механик",  min: 200,  max: 500  },
  { name: "Учёный",   min: 500,  max: 1000 },
  { name: "Академик", min: 1000, max: 2000 },
  { name: "Эпштейн",  min: 2000, max: 3500 },
];

function getLevel(xp: number) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return { ...LEVELS[i], index: i + 1 };
  }
  return { ...LEVELS[0], index: 1 };
}

// ── reusable components ───────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const { theme } = useTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 }, style]}>
      {children}
    </View>
  );
}

function Bar({ pct }: { pct: number }) {
  const { theme } = useTheme();
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.border }}>
      <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: "#F97316" }} />
    </View>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function DashboardScreen({ navigation }: DashboardHomeProps) {
  const { theme } = useTheme();

  // Fade-in on every tab focus
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fadeAnim]));

  const examDate  = String(lsGet("exam_date",  "2026-06-12") ?? "2026-06-12");
  const examType  = String(lsGet("exam_type",  "ЦТ") ?? "ЦТ");
  const dailyGoal = Number(lsGet("daily_goal", 10));
  const todayDone = Number(lsGet("today_done", 0));
  const streak    = Number(lsGet("streak_days", 0));
  const todayXP   = Number(lsGet("today_xp",   0));
  const totalXP   = Number(lsGet("xp_total",   0));
  const rtResults = useMemo<Array<{ type?: string; date?: string; score: number }>>(() => {
    try { return JSON.parse(String(lsGet("rt_results", "[]") ?? "[]")); }
    catch { return []; }
  }, []);

  const daysLeft  = getDaysLeft(examDate);
  const level     = getLevel(totalXP);
  const xpInLevel = totalXP - level.min;
  const xpForNext = level.max - level.min;
  const xpPct     = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));
  const goalPct   = dailyGoal > 0 ? Math.min(100, Math.round((todayDone / dailyGoal) * 100)) : 0;

  function navTo(tab: string) {
    navigation.getParent()?.navigate(tab as never);
  }

  const quickItems = [
    { label: "Задания",   sub: `${todayDone}/${dailyGoal} выполнено`, tab: "Tasks",    iconBg: "#EFF6FF", icon: "📝" },
    { label: "Формулы",   sub: "Карточки",                             tab: "Formulas", iconBg: "#FFF7ED", icon: "∑"  },
    { label: "Прогресс",  sub: "Статистика",                           tab: "Progress", iconBg: "#F0FDF4", icon: "📊" },
    { label: "Настройки", sub: "Параметры",                            tab: "Settings", iconBg: "#FDF4FF", icon: "⚙"  },
  ];

  function scoreStyle(n: number) {
    return n >= 70 ? { bg: "#F0FDF4", fg: "#15803D" }
         : n >= 50 ? { bg: "#FEFCE8", fg: "#92400E" }
                   : { bg: "#FEF2F2", fg: "#B91C1C" };
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

        {/* App title */}
        <Text style={[s.appName, { color: theme.text }]}>Flux</Text>

        {/* Countdown */}
        <View style={s.countdown}>
          <Text style={s.cdLabel}>До {examType} осталось</Text>
          <Text style={s.cdNum}>{daysLeft !== null ? Math.max(0, daysLeft) : "—"}</Text>
          <Text style={s.cdLabel}>{daysWord(daysLeft)}</Text>
          <Text style={s.cdDate}>{formatDate(examDate)}</Text>
        </View>

        {/* Streak + today */}
        <View style={s.row2}>
          <Card style={[s.halfCard, { alignItems: "center" }]}>
            <FlameIcon active={todayDone >= dailyGoal} size={34} />
            <Text style={[s.bold18, { color: theme.text, marginTop: 4 }]}>{streak}</Text>
            <Text style={[s.xs, { color: theme.muted }]}>{daysWord(streak)} стрик</Text>
          </Card>
          <Card style={s.halfCard}>
            <Text style={[s.xs, { color: theme.muted, marginBottom: 6 }]}>Сегодня</Text>
            <Bar pct={goalPct} />
            <Text style={[s.sm, { color: theme.text, marginTop: 6, fontWeight: "700" }]}>{todayDone} / {dailyGoal} задач</Text>
            {todayXP > 0 && <Text style={[s.xs, { color: "#F97316" }]}>+{todayXP} XP</Text>}
          </Card>
        </View>

        {/* XP bar */}
        <Card>
          <View style={s.between}>
            <Text style={[s.sm, { color: theme.text, fontWeight: "700" }]}>⚡ {level.name} • Ур. {level.index}</Text>
            <Text style={[s.xs, { color: theme.muted }]}>{xpInLevel} / {xpForNext} XP</Text>
          </View>
          <View style={{ marginTop: 8 }}><Bar pct={xpPct} /></View>
        </Card>

        {/* Quick access */}
        <View style={s.row2}>
          {quickItems.map(({ label, sub, tab, iconBg, icon }) => (
            <TouchableOpacity key={tab} activeOpacity={0.85}
              style={[s.quickCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navTo(tab)}>
              <View style={[s.iconBox, { backgroundColor: iconBg }]}>
                <Text style={{ fontSize: 18 }}>{icon}</Text>
              </View>
              <Text style={[s.sm, { color: theme.text, fontWeight: "600" }]}>{label}</Text>
              <Text style={[s.xs, { color: theme.muted }]}>{sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent results */}
        <View style={{ gap: 8 }}>
          <View style={s.between}>
            <Text style={[s.sm, { color: theme.text, fontWeight: "700" }]}>Последние результаты</Text>
            <TouchableOpacity onPress={() => navTo("Progress")}>
              <Text style={{ fontSize: 12, color: "#F97316", fontWeight: "600" }}>Все →</Text>
            </TouchableOpacity>
          </View>
          {rtResults.length === 0 ? (
            <Card><Text style={[s.xs, { color: theme.muted, textAlign: "center" }]}>Нет результатов</Text></Card>
          ) : (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              {rtResults.slice(-3).reverse().map((r, i) => {
                const sc = scoreStyle(r.score);
                return (
                  <View key={i} style={[s.resultRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
                    <View>
                      <Text style={[s.sm, { color: theme.text, fontWeight: "600" }]}>{r.type || "Тест"}</Text>
                      <Text style={[s.xs, { color: theme.muted }]}>{r.date}</Text>
                    </View>
                    <View style={{ backgroundColor: sc.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <Text style={[s.sm, { color: sc.fg, fontWeight: "700" }]}>{r.score}%</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}
        </View>

      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  appName:  { fontSize: 20, fontWeight: "800", textAlign: "center", marginBottom: 4 },
  countdown:{ backgroundColor: "#F97316", borderRadius: 16, padding: 20, alignItems: "center" },
  cdLabel:  { fontSize: 13, color: "#fff", opacity: 0.9, fontWeight: "500" },
  cdNum:    { fontSize: 64, fontWeight: "800", color: "#fff", lineHeight: 72 },
  cdDate:   { fontSize: 11, color: "#fff", opacity: 0.7, marginTop: 2 },
  row2:     { flexDirection: "row", gap: 12 },
  halfCard: { flex: 1, gap: 4 },
  bold18:   { fontSize: 18, fontWeight: "700" },
  sm:       { fontSize: 13 },
  xs:       { fontSize: 11 },
  between:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  quickCard:{ flex: 1, borderRadius: 16, borderWidth: 1, padding: 12, gap: 6 },
  iconBox:  { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  resultRow:{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
});
