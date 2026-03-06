import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, Switch, ScrollView, TouchableOpacity,
  Modal, StyleSheet, Alert, Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { lsGet, lsSet } from "@/utils/storage";
import { CACHE_GENERATED_AT_KEY } from "@/utils/generateQuestions";
import { refreshNotifications, enableNotifications } from "@/utils/notifications";
import { Slider } from "@/components/Slider";
import type { SettingsHomeProps } from "@/navigation/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatGeneratedAt(iso: unknown): string {
  if (!iso || typeof iso !== "string") return "нет данных";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function goalWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "задача";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "задачи";
  return "задач";
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text style={[g.sectionHeader, { color: theme.muted }]}>{label}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 16 }}>
      {children}
    </View>
  );
}

function Row({ label, right, onPress, red }: { label: string; right?: React.ReactNode; onPress?: () => void; red?: boolean }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14,
               borderBottomWidth: 1, borderBottomColor: theme.border }}>
      <Text style={{ fontSize: 14, color: red ? "#EF4444" : theme.text }}>{label}</Text>
      {right}
    </TouchableOpacity>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen(_props: SettingsHomeProps) {
  const { theme, toggleTheme } = useTheme();

  // Fade-in on focus
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fadeAnim]));

  const [dailyGoal, setDailyGoal] = useState(() => Number(lsGet("daily_goal", 10) ?? 10));
  const [notif,     setNotif]     = useState(() => lsGet("notif_enabled", false) === true || lsGet("notif_enabled", "false") === "true");
  const [resetModal, setResetModal] = useState(false);

  const questionsAt = formatGeneratedAt(lsGet(CACHE_GENERATED_AT_KEY, null));
  const examDate = String(lsGet("exam_date", "—") ?? "—");
  const examType = String(lsGet("exam_type",  "ЦТ") ?? "ЦТ");

  const handleGoalChange = (v: number) => {
    setDailyGoal(v);
    lsSet("daily_goal", v);
  };

  const handleNotifToggle = async (v: boolean) => {
    if (v) {
      const granted = await enableNotifications();
      if (!granted) {
        Alert.alert("Нет доступа", "Разреши уведомления в настройках устройства.");
        return;
      }
      setNotif(true);
      lsSet("notif_enabled", true);
      const todayDone = Number(lsGet("today_done", 0));
      const goal = Number(lsGet("daily_goal", 10));
      refreshNotifications(true, todayDone >= goal);
    } else {
      setNotif(false);
      lsSet("notif_enabled", false);
      refreshNotifications(false, false); // cancels all scheduled
    }
  };

  const handleReset = () => {
    AsyncStorage.clear().then(() => {
      Alert.alert("Готово", "Прогресс сброшен. Перезапусти приложение.", [{ text: "OK" }]);
    });
    setResetModal(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 4, paddingBottom: 40 }}>
          <Text style={[g.h1, { color: theme.text }]}>Настройки</Text>

          {/* Внешний вид */}
          <SectionHeader label="ВНЕШНИЙ ВИД" />
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 }}>
              <Text style={{ fontSize: 14, color: theme.text }}>Тёмная тема</Text>
              <Switch
                value={theme.dark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: "#F97316" }}
                thumbColor={theme.card}
              />
            </View>
          </Card>

          {/* Экзамен */}
          <SectionHeader label="ЭКЗАМЕН" />
          <Card>
            <Row label={`Дата ${examType}`} right={<Text style={{ fontSize: 13, color: theme.muted }}>{examDate}</Text>} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 }}>
              <Text style={{ fontSize: 14, color: theme.text }}>Тип экзамена</Text>
              <Text style={{ fontSize: 13, color: theme.muted }}>{examType}</Text>
            </View>
          </Card>

          {/* Ежедневная цель — слайдер 1–15 */}
          <SectionHeader label="ЕЖЕДНЕВНАЯ ЦЕЛЬ" />
          <Card>
            <View style={{ paddingVertical: 14, gap: 4 }}>
              <Text style={{ fontSize: 14, color: theme.text }}>Задач в день</Text>
              <Slider
                value={dailyGoal}
                min={1}
                max={15}
                step={1}
                onChange={handleGoalChange}
                formatLabel={v => `${v} ${goalWord(v)} ежедневно`}
                trackColor={theme.border}
              />
            </View>
          </Card>

          {/* Уведомления */}
          <SectionHeader label="УВЕДОМЛЕНИЯ" />
          <Card>
            <View style={{ paddingVertical: 14, gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontSize: 14, color: theme.text }}>Напоминания</Text>
                <Switch
                  value={notif}
                  onValueChange={handleNotifToggle}
                  trackColor={{ false: theme.border, true: "#F97316" }}
                  thumbColor={theme.card}
                />
              </View>
              {notif && (
                <Text style={{ fontSize: 12, color: theme.muted, lineHeight: 17 }}>
                  Приходят в 12:00, 19:00 и 22:00 — только если дневная цель ещё не выполнена.
                </Text>
              )}
            </View>
          </Card>

          {/* Вопросы */}
          <SectionHeader label="ВОПРОСЫ" />
          <Card>
            <View style={{ paddingVertical: 14, gap: 2 }}>
              <Text style={{ fontSize: 14, color: theme.text }}>Последнее обновление</Text>
              <Text style={{ fontSize: 12, color: theme.muted }}>{questionsAt}</Text>
            </View>
          </Card>

          {/* Данные */}
          <SectionHeader label="ДАННЫЕ" />
          <Card>
            <View style={{ borderBottomWidth: 0 }}>
              <Row label="Сбросить весь прогресс" red onPress={() => setResetModal(true)} />
            </View>
          </Card>

          <Text style={{ fontSize: 12, color: theme.muted, textAlign: "center", marginTop: 16 }}>Flux • v0.2.0</Text>
        </ScrollView>
      </Animated.View>

      {/* Reset modal */}
      <Modal visible={resetModal} transparent animationType="fade">
        <View style={g.overlay}>
          <View style={[g.dialog, { backgroundColor: theme.card }]}>
            <Text style={[g.dialogTitle, { color: theme.text }]}>Сбросить прогресс?</Text>
            <Text style={{ fontSize: 14, color: theme.muted, marginBottom: 16 }}>Все данные будут удалены. Это действие нельзя отменить.</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity style={[g.dialogBtn, { borderColor: theme.border, flex: 1 }]} onPress={() => setResetModal(false)}>
                <Text style={{ color: theme.muted, fontWeight: "600" }}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[g.dialogBtn, { backgroundColor: "#EF4444", borderColor: "#EF4444", flex: 1 }]} onPress={handleReset}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>Сбросить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const g = StyleSheet.create({
  h1:           { fontSize: 20, fontWeight: "800", paddingTop: 8, marginBottom: 8 },
  sectionHeader:{ fontSize: 11, fontWeight: "700", marginTop: 12, marginBottom: 4, paddingHorizontal: 4 },
  overlay:      { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  dialog:       { borderRadius: 20, padding: 24, width: "100%" },
  dialogTitle:  { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  dialogBtn:    { paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
});
