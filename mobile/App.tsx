import React, { useEffect, useState, useCallback } from "react";
import { View, ActivityIndicator, AppState } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { RootNavigator } from "@/navigation";
import { hydrateCache, checkAndUpdateStreak, lsGet, lsSet } from "@/utils/storage";
import { prefetchQuestions } from "@/utils/generateQuestions";
import { refreshNotifications } from "@/utils/notifications";
import FirstRunScreen from "@/screens/FirstRun";

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
  const [firstRun, setFirstRun] = useState(() => !lsGet("onboarding_complete", false));

  // Refresh smart notifications whenever app comes to foreground
  const doNotifRefresh = useCallback(() => {
    const enabled = lsGet("notif_enabled", false) === true;
    const todayDone = Number(lsGet("today_done", 0));
    const dailyGoal = Number(lsGet("daily_goal", 10));
    refreshNotifications(enabled, todayDone >= dailyGoal);
  }, []);

  useEffect(() => {
    if (firstRun) return;

    checkAndUpdateStreak().catch((e) => console.warn("streak:", e));
    prefetchQuestions().catch((err: Error) => {
      console.warn("prefetchQuestions:", err.message);
    });
    doNotifRefresh();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") doNotifRefresh();
    });
    return () => sub.remove();
  }, [firstRun, doNotifRefresh]);

  const handleFirstRunComplete = useCallback(() => {
    lsSet("onboarding_complete", true);
    setFirstRun(false);
  }, []);

  if (firstRun) {
    return <FirstRunScreen onComplete={handleFirstRunComplete} />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={theme.dark ? "light" : "dark"} translucent={false} />
      <RootNavigator />
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
