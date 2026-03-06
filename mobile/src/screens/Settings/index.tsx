import React, { useState } from "react";
import {
  View, Text, Switch, ScrollView, TouchableOpacity,
  Modal, StyleSheet, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { lsGet, lsSet } from "@/utils/storage";
import { CACHE_GENERATED_AT_KEY } from "@/utils/generateQuestions";
import type { SettingsHomeProps } from "@/navigation/types";

// ── notifications ─────────────────────────────────────────────────────────────

async function scheduleDaily(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Flux — время задач!",
      body: "Не забудь выполнить дневную цель по физике.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 19,
      minute: 0,
    },
  });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function formatGeneratedAt(iso: unknown): string {
  if (!iso || typeof iso !== "string") return "нет данных";
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

  const [dailyGoal, setDailyGoal] = useState(() => String(lsGet("daily_goal", "10") ?? "10"));
  const [notif,     setNotif]     = useState(() => lsGet("notif_enabled", false) === true || lsGet("notif_enabled", "false") === "true");
  const [resetModal, setResetModal] = useState(false);

  const questionsAt = formatGeneratedAt(lsGet(CACHE_GENERATED_AT_KEY, null));

  const examDate = String(lsGet("exam_date", "—") ?? "—");
  const examType = String(lsGet("exam_type",  "ЦТ") ?? "ЦТ");

  const handleReset = () => {
    AsyncStorage.clear().then(() => {
      Alert.alert("Готово", "Прогресс сброшен. Перезапусти приложение.", [{ text: "OK" }]);
    });
    setResetModal(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
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

        {/* Ежедневная цель */}
        <SectionHeader label="ЕЖЕДНЕВНАЯ ЦЕЛЬ" />
        <Card>
          <View style={{ paddingVertical: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["5", "10", "15"].map(g => (
                <TouchableOpacity key={g} onPress={() => { setDailyGoal(g); lsSet("daily_goal", g); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
                    backgroundColor: dailyGoal === g ? "#F97316" : theme.bg,
                    borderWidth: 1, borderColor: dailyGoal === g ? "#F97316" : theme.border }}>
                  <Text style={{ fontWeight: "600", fontSize: 14, color: dailyGoal === g ? "#fff" : theme.muted }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: theme.muted, textAlign: "center" }}>{dailyGoal} задач ежедневно</Text>
          </View>
        </Card>

        {/* Уведомления */}
        <SectionHeader label="УВЕДОМЛЕНИЯ" />
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 }}>
            <Text style={{ fontSize: 14, color: theme.text }}>Напоминания</Text>
            <Switch
              value={notif}
              onValueChange={async v => {
                if (v) {
                  const { status } = await Notifications.requestPermissionsAsync();
                  if (status !== "granted") {
                    Alert.alert("Нет доступа", "Разреши уведомления в настройках устройства.");
                    return;
                  }
                  scheduleDaily();
                } else {
                  Notifications.cancelAllScheduledNotificationsAsync();
                }
                setNotif(v);
                lsSet("notif_enabled", v);
              }}
              trackColor={{ false: theme.border, true: "#F97316" }}
              thumbColor={theme.card}
            />
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
