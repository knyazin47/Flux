// First-run screen: shown on first launch (no onboarding_complete flag in storage).
// Downloads daily questions. If offline and no cache → shows no-internet error + retry.
// On success: calls onComplete() which sets onboarding_complete and enters the main app.

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { prefetchQuestions } from "@/utils/generateQuestions";

type Status = "loading" | "error";

interface Props {
  onComplete: () => void;
}

export default function FirstRunScreen({ onComplete }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const tryFetch = useCallback(async () => {
    setStatus("loading");
    try {
      await prefetchQuestions();
      // Success — fade out then enter main app
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onComplete());
    } catch {
      setStatus("error");
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [onComplete, fadeAnim]);

  useEffect(() => {
    // Start with fade-in of loading state
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    tryFetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRetry = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => tryFetch());
  };

  return (
    <SafeAreaView style={s.safe}>
      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        {/* Logo area */}
        <View style={s.logoArea}>
          <Text style={s.logo}>Flux</Text>
          <Text style={s.tagline}>Подготовка к физике</Text>
        </View>

        {status === "loading" && (
          <View style={s.statusArea}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={s.loadingText}>Загружаем вопросы…</Text>
            <Text style={s.subText}>Нужно подключение к интернету</Text>
          </View>
        )}

        {status === "error" && (
          <View style={s.statusArea}>
            <Text style={s.errorIcon}>!</Text>
            <Text style={s.errorTitle}>Нет подключения</Text>
            <Text style={s.errorSub}>
              Для первого запуска необходим интернет, чтобы загрузить вопросы.
            </Text>
            <TouchableOpacity style={s.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
              <Text style={s.retryText}>Повторить</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 48,
  },
  logoArea: {
    alignItems: "center",
    gap: 8,
  },
  logo: {
    fontSize: 48,
    fontWeight: "800",
    color: "#F97316",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: "#94A3B8",
    fontWeight: "500",
  },
  statusArea: {
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F1F5F9",
    marginTop: 8,
  },
  subText: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  errorIcon: {
    fontSize: 48,
    color: "#EF4444",
    fontWeight: "800",
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F1F5F9",
  },
  errorSub: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: "#F97316",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
