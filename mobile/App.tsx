import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { RootNavigator } from "@/navigation";
import { hydrateCache, checkAndUpdateStreak } from "@/utils/storage";
import { prefetchQuestions } from "@/utils/generateQuestions";

function AppInner() {
  const { theme } = useTheme();

  useEffect(() => {
    checkAndUpdateStreak();
    prefetchQuestions().catch((err: Error) => {
      console.warn("prefetchQuestions:", err.message);
    });
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style={theme.dark ? "light" : "dark"} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    hydrateCache().finally(() => setReady(true));
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
