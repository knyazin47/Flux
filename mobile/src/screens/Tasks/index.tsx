import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, ScrollView,
  Modal, ActivityIndicator, StyleSheet, Pressable, Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import {
  lsGet, lsGetAsync, lsSet, lsRemove,
  incrementTodayDone, addXP, updateTopicStats, checkAchievements,
} from "@/utils/storage";
import { generateQuestions } from "@/utils/generateQuestions";
import { refreshNotifications } from "@/utils/notifications";
import { Slider } from "@/components/Slider";
import type { TasksHomeProps } from "@/navigation/types";

// ── constants ─────────────────────────────────────────────────────────────────

const TOPICS_FILTER = [
  "Все", "Механика", "Молекулярная физика", "Термодинамика",
  "Электростатика", "Постоянный ток", "Электромагнетизм",
  "Колебания и волны", "Оптика", "Квантовая и ядерная физика",
];
const LABELS = ["А", "Б", "В", "Г", "Д"];
const TIMER_OPTIONS = [
  { label: "Нет", value: 0 },
  { label: "30с",  value: 30  },
  { label: "1м",   value: 60  },
  { label: "2м",   value: 120 },
  { label: "3м",   value: 180 },
];
const STARS_EMOJI = ["☆", "★"];

type Question = {
  topic: string;
  text: string;
  options: string[];
  correct: number;
  formula?: string;
  explanation?: string;
};

type AnswerRecord = { topic: string; correct: boolean };

type SessionData = {
  questions: Question[];
  qIndex: number;
  answers: AnswerRecord[];
  timerDuration: number;
  activeTopic: string;
  sessionCount: number;
  currentSelected: number | null;
};

// ── helpers ───────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function questionWord(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return "вопрос";
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return "вопроса";
  return "вопросов";
}

// ── small components ──────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const { theme } = useTheme();
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.border }}>
      <View style={{ width: `${pct}%`, height: 6, borderRadius: 3, backgroundColor: "#F97316" }} />
    </View>
  );
}

function OrangeBtn({ label, onPress, outlined, disabled }: {
  label: string; onPress: () => void; outlined?: boolean; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.85}
      onPress={disabled ? undefined : onPress}
      style={[outlined ? s.btnOutlined : s.btn, disabled && { opacity: 0.5 }]}
    >
      <Text style={outlined ? s.btnOutlinedText : s.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── screen ────────────────────────────────────────────────────────────────────

export default function TasksScreen({ navigation }: TasksHomeProps) {
  const { theme } = useTheme();

  // Fade-in on focus (start screen only; question/results render instantly)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useFocusEffect(useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [fadeAnim]));

  const [view, setView]               = useState<"start" | "loading" | "question" | "results">("start");
  const [activeTopic, setActiveTopic] = useState("Все");
  const [sessionCount, setSessionCount] = useState(10);
  const [timerDuration, setTimerD]    = useState(0);
  const [questions, setQuestions]     = useState<Question[]>([]);
  const [qIndex, setQIndex]           = useState(0);
  const [selected, setSelected]       = useState<number | null>(null);
  const [answers, setAnswers]         = useState<AnswerRecord[]>([]);
  const [timeLeft, setTimeLeft]       = useState(0);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [resumeModal, setResumeModal] = useState(false);
  // Prevents double-tap "Next" during the brief 200ms result-display delay
  const [transitioning, setTransitioning] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dailyGoal = Number(lsGet("daily_goal", 10));
  const todayDone = Number(lsGet("today_done", 0));

  useEffect(() => {
    lsGetAsync("tasks_session").then(val => { if (val) setResumeModal(true); });
  }, []);

  // Timer — resets on each new question
  useEffect(() => {
    if (view !== "question" || timerDuration === 0) return;
    setTimeLeft(timerDuration);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleNext(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, qIndex]);

  const saveSnapshot = useCallback((overrides: Partial<SessionData> = {}) => {
    const snap: SessionData = {
      questions, qIndex, answers, timerDuration, activeTopic,
      sessionCount, currentSelected: selected, ...overrides,
    };
    lsSet("tasks_session", snap);
  }, [questions, qIndex, answers, timerDuration, activeTopic, sessionCount, selected]);

  const continueSession = async () => {
    const raw = await lsGetAsync("tasks_session") as SessionData | null;
    if (!raw) { setResumeModal(false); return; }
    setQuestions(raw.questions);
    setQIndex(raw.qIndex);
    setAnswers(raw.answers || []);
    setTimerD(raw.timerDuration || 0);
    setActiveTopic(raw.activeTopic || "Все");
    setSessionCount(raw.sessionCount || 10);
    setSelected(raw.currentSelected ?? null);
    setTimeLeft(raw.timerDuration || 0);
    setView("question");
    setResumeModal(false);
  };

  const restartSession = () => { lsRemove("tasks_session"); setResumeModal(false); };

  const handleExit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    lsRemove("tasks_session");
    setSelected(null); setTransitioning(false); setView("start"); setConfirmExit(false);
  };

  const startSession = async () => {
    setView("loading"); setLoadError(null);
    await lsRemove("tasks_session");
    try {
      const topic = activeTopic === "Все"
        ? TOPICS_FILTER[Math.floor(Math.random() * (TOPICS_FILTER.length - 1)) + 1]
        : activeTopic;
      const qs = await generateQuestions(topic, sessionCount, 2) as Question[];
      if (qs.length === 0) throw new Error("Нет вопросов");
      setQuestions(qs); setQIndex(0); setSelected(null); setAnswers([]); setTimeLeft(timerDuration);
      setView("question");
    } catch {
      setLoadError("Не удалось загрузить вопросы. Проверь подключение."); setView("start");
    }
  };

  const handleSelect = (idx: number) => {
    if (selected !== null || transitioning) return;
    setSelected(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    saveSnapshot({ currentSelected: idx });
  };

  // Fixed transition: setSelected(null) now happens INSIDE proceed() so it batches
  // with qIndex change in a single React render → zero visible lag between questions.
  const handleNext = useCallback((timeout = false) => {
    if (transitioning) return;
    const q = questions[qIndex];
    if (!q) return;
    const wasCorrect = !timeout && selected === q.correct;
    const newAnswers = [...answers, { topic: q.topic, correct: wasCorrect }];
    const isLast = qIndex + 1 >= questions.length;
    const nextIdx = qIndex + 1;

    if (!isLast) saveSnapshot({ qIndex: nextIdx, answers: newAnswers, currentSelected: null });

    const proceed = () => {
      setTransitioning(false);
      if (isLast) {
        lsRemove("tasks_session");
        const correct = newAnswers.filter(a => a.correct).length;
        addXP(correct * 10);
        incrementTodayDone(questions.length).then(done => {
          const goal = Number(lsGet("daily_goal", 10));
          if (done >= goal) {
            // Cancel today's reminders — goal is complete (Duolingo-style)
            refreshNotifications(lsGet("notif_enabled", false) === true, true);
          }
        });
        const byTopic: Record<string, { correct: number; total: number }> = {};
        newAnswers.forEach(({ topic, correct: c }) => {
          if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
          byTopic[topic].total += 1;
          if (c) byTopic[topic].correct += 1;
        });
        Object.entries(byTopic).forEach(([t, { correct: c, total }]) => updateTopicStats(t, c, total));
        checkAchievements();
        // All result state in one render
        setSelected(null);
        setAnswers(newAnswers);
        setView("results");
      } else {
        // Batch selection clear + question advance into one React render (no lag)
        setSelected(null);
        setAnswers(newAnswers);
        setQIndex(nextIdx);
      }
    };

    if (timeout) {
      setSelected(null);
      proceed();
    } else {
      // 200ms so user sees correct/wrong colour feedback, then instant atomic transition
      setTransitioning(true);
      setTimeout(proceed, 200);
    }
  }, [questions, qIndex, selected, answers, saveSnapshot, transitioning]);

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (view === "loading") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" color="#F97316" />
      <Text style={{ color: theme.muted, marginTop: 16, fontSize: 14 }}>Загружаем вопросы…</Text>
    </SafeAreaView>
  );

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (view === "results") {
    const correct = answers.filter(a => a.correct).length;
    const total = questions.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const stars = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
    const motivation = pct >= 80 ? "Отличная работа!" : pct >= 60 ? "Хороший результат!" : "Продолжай стараться!";
    const weakTopics: Record<string, number> = {};
    questions.forEach((q, i) => { if (!answers[i]?.correct) weakTopics[q.topic] = (weakTopics[q.topic] || 0) + 1; });

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, alignItems: "center" }}>
          <Text style={{ fontSize: 40, fontWeight: "800", color: theme.text }}>{correct} / {total}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Text key={i} style={{ fontSize: 26, color: "#F97316" }}>{i < stars ? STARS_EMOJI[1] : STARS_EMOJI[0]}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.text }}>{motivation}</Text>
          <View style={{ backgroundColor: "#F97316", borderRadius: 999, paddingHorizontal: 20, paddingVertical: 8 }}>
            <Text style={{ color: "#fff", fontWeight: "700" }}>+{correct * 10} XP</Text>
          </View>

          {Object.keys(weakTopics).length > 0 && (
            <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, width: "100%" }}>
              <Text style={{ fontWeight: "700", color: theme.text, marginBottom: 8 }}>Слабые места:</Text>
              {Object.entries(weakTopics).map(([t, n]) => (
                <View key={t} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: theme.muted, fontSize: 13 }}>{t}</Text>
                  <Text style={{ color: "#EF4444", fontSize: 13 }}>{n} ошибок</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ width: "100%", gap: 10 }}>
            <OrangeBtn label="На главную" onPress={() => { navigation.getParent()?.navigate("Dashboard" as never); }} />
            <OrangeBtn label="Ещё раз" outlined onPress={() => { setView("start"); setAnswers([]); }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── QUESTION ───────────────────────────────────────────────────────────────
  if (view === "question") {
    const q = questions[qIndex];
    if (!q) return null;

    const optionStyle = (idx: number) => {
      if (selected === null) return { bg: theme.card, border: theme.border, fg: theme.text };
      if (idx === q.correct) return { bg: "#F0FDF4", border: "#22C55E", fg: "#15803D" };
      if (idx === selected) return  { bg: "#FEF2F2", border: "#EF4444", fg: "#B91C1C" };
      return { bg: theme.card, border: theme.border, fg: theme.text };
    };

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <Modal visible={confirmExit} transparent animationType="fade">
          <View style={s.overlay}>
            <View style={[s.dialog, { backgroundColor: theme.card }]}>
              <Text style={[s.dialogTitle, { color: theme.text }]}>Выйти из задания?</Text>
              <Text style={[s.dialogSub, { color: theme.muted }]}>Прогресс не сохранится.</Text>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={[s.dialogBtn, { borderColor: theme.border }]} onPress={() => setConfirmExit(false)}>
                  <Text style={{ color: theme.muted, fontWeight: "600" }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.dialogBtn, { backgroundColor: "#EF4444", borderColor: "#EF4444" }]} onPress={handleExit}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Выйти</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity onPress={() => setConfirmExit(true)}>
              <Text style={{ color: theme.muted, fontSize: 14 }}>✕ Выйти</Text>
            </TouchableOpacity>
            {timerDuration > 0 && (
              <Text style={{ fontSize: 18, fontWeight: "700", color: timeLeft < 10 ? "#EF4444" : theme.text }}>
                ⏱ {formatTime(timeLeft)}
              </Text>
            )}
            <Text style={{ color: theme.muted, fontSize: 12 }}>Вопрос {qIndex + 1}/{questions.length}</Text>
          </View>

          <ProgressBar value={qIndex + 1} max={questions.length} />

          <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#F97316", marginBottom: 8, textTransform: "uppercase" }}>{q.topic}</Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: theme.text }}>{q.text}</Text>
          </View>

          <FlatList
            data={q.options}
            keyExtractor={(_, i) => String(i)}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item: opt, index: idx }) => {
              const st = optionStyle(idx);
              const clean = opt.replace(/^[АБВГД][:.]\s*/u, "");
              const showCheck = selected !== null && idx === q.correct;
              const showX     = selected !== null && idx === selected && idx !== q.correct;
              return (
                <Pressable onPress={() => handleSelect(idx)}
                  style={{ backgroundColor: st.bg, borderWidth: 1.5, borderColor: st.border,
                           borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
                           flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ flex: 1, textAlign: "center", fontSize: 14, lineHeight: 20, color: st.fg }}>
                    <Text style={{ fontWeight: "700" }}>{LABELS[idx]})</Text>{" "}{clean}
                  </Text>
                  {showCheck && <View style={s.iconDot}><Text style={{ color: "#fff" }}>✓</Text></View>}
                  {showX     && <View style={[s.iconDot, { backgroundColor: "#EF4444" }]}><Text style={{ color: "#fff" }}>✕</Text></View>}
                </Pressable>
              );
            }}
          />

          {selected !== null && (q.formula || q.explanation) && (
            <View style={{ backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", borderRadius: 16, padding: 14, gap: 8 }}>
              {q.formula && (
                <View style={{ backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 10, padding: 10, alignItems: "center" }}>
                  <Text style={{ fontFamily: "monospace", fontSize: 16, color: "#92400E" }}>{q.formula}</Text>
                </View>
              )}
              {q.explanation && (
                <Text style={{ fontSize: 13, lineHeight: 19, color: "#92400E" }}>💡 {q.explanation}</Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Next stays visible during 200ms transition, disabled to prevent double-tap */}
        {selected !== null && (
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 24 }}>
            <TouchableOpacity
              style={[s.btn, transitioning && { opacity: 0.55 }]}
              disabled={transitioning}
              onPress={() => handleNext()}
            >
              <Text style={s.btnText}>{qIndex + 1 >= questions.length ? "Завершить →" : "Следующий →"}</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── START ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <Modal visible={resumeModal} transparent animationType="fade">
          <View style={s.overlay}>
            <View style={[s.dialog, { backgroundColor: theme.card }]}>
              <Text style={[s.dialogTitle, { color: theme.text }]}>Незавершённое задание</Text>
              <Text style={[s.dialogSub, { color: theme.muted }]}>Продолжить или начать заново?</Text>
              <TouchableOpacity style={[s.btn, { marginTop: 4 }]} onPress={continueSession}>
                <Text style={s.btnText}>▶ Продолжить</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.dialogBtn, { borderColor: theme.border, marginTop: 8 }]} onPress={restartSession}>
                <Text style={{ color: theme.muted, fontWeight: "600" }}>Начать заново</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
          <Text style={[s.h1, { color: theme.text }]}>Ежедневное задание</Text>

          {loadError && (
            <View style={{ backgroundColor: "#FEF2F2", borderRadius: 12, padding: 12 }}>
              <Text style={{ color: "#B91C1C", fontSize: 13 }}>{loadError}</Text>
            </View>
          )}

          {/* Daily progress ring */}
          <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 4, borderColor: "#F97316", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.text }}>{todayDone}/{dailyGoal}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: theme.text }}>{todayDone} из {dailyGoal} выполнено</Text>
              <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>Дневная цель</Text>
            </View>
          </View>

          {/* Topic selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {TOPICS_FILTER.map(t => (
                <TouchableOpacity key={t} onPress={() => setActiveTopic(t)}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
                           backgroundColor: activeTopic === t ? "#F97316" : theme.card,
                           borderWidth: 1, borderColor: activeTopic === t ? "#F97316" : theme.border }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: activeTopic === t ? "#fff" : theme.muted }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Question count slider (1–15) */}
          <View style={{ backgroundColor: theme.card, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 4 }}>
            <Text style={{ fontSize: 13, color: theme.muted }}>Количество вопросов</Text>
            <Slider
              value={sessionCount}
              min={1}
              max={15}
              step={1}
              onChange={setSessionCount}
              formatLabel={v => `${v} ${questionWord(v)}`}
              trackColor={theme.border}
            />
          </View>

          {/* Timer selector */}
          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: theme.muted }}>⏱ Таймер на вопрос</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {TIMER_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.value} onPress={() => setTimerD(opt.value)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: "center",
                           backgroundColor: timerDuration === opt.value ? "#F97316" : theme.card,
                           borderWidth: 1, borderColor: timerDuration === opt.value ? "#F97316" : theme.border }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: timerDuration === opt.value ? "#fff" : theme.muted }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <OrangeBtn label="Начать →" onPress={startSession} />
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  h1:          { fontSize: 20, fontWeight: "800", paddingTop: 8 },
  btn:         { backgroundColor: "#F97316", borderRadius: 16, paddingVertical: 16, alignItems: "center" },
  btnText:     { color: "#fff", fontWeight: "700", fontSize: 15 },
  btnOutlined: { borderWidth: 2, borderColor: "#F97316", borderRadius: 16, paddingVertical: 14, alignItems: "center" },
  btnOutlinedText: { color: "#F97316", fontWeight: "700", fontSize: 15 },
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  dialog:      { borderRadius: 20, padding: 24, width: "100%", gap: 8 },
  dialogTitle: { fontSize: 16, fontWeight: "700" },
  dialogSub:   { fontSize: 14 },
  dialogBtn:   { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  iconDot:     { width: 28, height: 28, borderRadius: 8, backgroundColor: "#22C55E", alignItems: "center", justifyContent: "center", marginLeft: 8 },
});
