import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { RootNavigator } from "@/navigation";
import { hydrateCache, checkAndUpdateStreak, lsGet, lsSet } from "@/utils/storage";
import { prefetchQuestions } from "@/utils/generateQuestions";
import { refreshNotifications } from "@/utils/notifications";

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn("Notifications.setNotificationHandler failed:", e);
}

// ── Inner app (rendered after cache is hydrated + theme is available) ─────────

function AppInner() {
  const { theme } = useTheme();
  const [noInternet, setNoInternet] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const doNotifRefresh = useCallback(() => {
    const enabled = lsGet("notif_enabled", false) === true;
    const todayDone = Number(lsGet("today_done", 0));
    const dailyGoal = Number(lsGet("daily_goal", 10));
    refreshNotifications(enabled, todayDone >= dailyGoal);
  }, []);

  // Ensure defaults are set for first-time users (no onboarding page)
  useEffect(() => {
    if (!lsGet("exam_date", null)) lsSet("exam_date", "2026-06-05");
    if (!lsGet("exam_type", null)) lsSet("exam_type", "ЦТ");
    if (!lsGet("daily_goal", null)) lsSet("daily_goal", 10);
  }, []);

  useEffect(() => {
    checkAndUpdateStreak().catch((e) => console.warn("streak:", e));
    prefetchQuestions().catch((err: Error) => {
      if (err.message === "no_cache") setNoInternet(true);
    });
    doNotifRefresh();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") doNotifRefresh();
    });
    return () => sub.remove();
  }, [doNotifRefresh]);

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      await prefetchQuestions();
      setNoInternet(false);
    } catch {
      // still no internet — keep overlay visible
    } finally {
      setRetrying(false);
    }
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style={theme.dark ? "light" : "dark"} translucent={false} />
      <RootNavigator />

      {/* No-internet gate — blocks UI until questions are cached */}
      {noInternet && (
        <View style={s.overlay}>
          <View style={s.card}>
            <Text style={s.title}>Необходим интернет</Text>
            <Text style={s.body}>
              При первом запуске нужно загрузить вопросы. Подключись к интернету и повтори попытку.
            </Text>
            <TouchableOpacity
              style={s.btn}
              onPress={handleRetry}
              activeOpacity={0.85}
              disabled={retrying}
            >
              {retrying
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.btnText}>Повторить</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </NavigationContainer>
  );
}

// ── Root: wait for AsyncStorage hydration before rendering ────────────────────

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateCache()
      .catch((e) => console.warn("hydrateCache:", e))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F172A" }}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    zIndex: 999,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 12,
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#F1F5F9",
    textAlign: "center",
  },
  body: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
  btn: {
    marginTop: 4,
    backgroundColor: "#F97316",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minWidth: 140,
    alignItems: "center",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
