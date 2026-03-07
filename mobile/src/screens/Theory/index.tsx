import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal,
  ActivityIndicator, StyleSheet, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import {
  lsGet, lsSet, lsRemove,
  addXP, incrementTodayDone, updateTopicStats, checkAchievements,
} from "@/utils/storage";
import { generateQuestions } from "@/utils/generateQuestions";
import type { TheoryHomeProps } from "@/navigation/types";

// ── constants ─────────────────────────────────────────────────────────────────

const TOPICS_LIST = [
  "Все темы", "Механика", "Молекулярная физика", "Термодинамика",
  "Электростатика", "Постоянный ток", "Электромагнетизм",
  "Колебания и волны", "Оптика", "Квантовая и ядерная физика",
];
const LABELS = ["А", "Б", "В", "Г", "Д"];
const SESSION_COUNT = 15;
const TIMER_OPTIONS = [
  { label: "Нет", value: 0 },
  { label: "30с", value: 30 },
  { label: "1м",  value: 60 },
  { label: "2м",  value: 120 },
  { label: "3м",  value: 180 },
];

type Question = {
  topic: string;
  text: string;
  options: string[];
  correct: number;
  formula?: string;
  explanation?: string;
};

type AnswerRecord = { topic: string; correct: boolean };

function formatTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
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
    <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.85}
      style={{
        paddingVertical: 14, borderRadius: 16, alignItems: "center",
        backgroundColor: outlined ? "transparent" : disabled ? "#FDA975" : "#F97316",
        borderWidth: outlined ? 2 : 0, borderColor: "#F97316",
      }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color: outlined ? "#F97316" : "#fff" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function TheoryScreen(_props: TheoryHomeProps) {
  const { theme } = useTheme();

  const [selectedTopic, setSelectedTopic] = useState("Все темы");
  const [topicOpen,     setTopicOpen]     = useState(false);
  const [mode,          setMode]          = useState<"topic" | "random">("topic");
  const [view,          setView]          = useState<"start" | "loading" | "question" | "finished">("start");
  const [qIndex,        setQIndex]        = useState(0);
  const [selected,      setSelected]      = useState<number | null>(null);
  const [sessionQ,      setSessionQ]      = useState<Question[]>([]);
  const [answers,       setAnswers]       = useState<AnswerRecord[]>([]);
  const [timerDuration, setTimerDuration] = useState(0);
  const [timeLeft,      setTimeLeft]      = useState(0);
  const [loadError,     setLoadError]     = useState<string | null>(null);
  const [confirmExit,   setConfirmExit]   = useState(false);
  const [resumeModal,   setResumeModal]   = useState(() => !!lsGet("theory_session", null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer per question
  useEffect(() => {
    if (view !== "question" || timerDuration === 0) return;
    setTimeLeft(timerDuration);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleNext(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [view, qIndex, timerDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSession = (overrides: object = {}) => {
    const base = { sessionQ, qIndex, answers, timerDuration, selectedTopic, mode, currentSelected: selected };
    lsSet("theory_session", { ...base, ...overrides });
  };

  const continueSession = () => {
    const raw = lsGet("theory_session", null);
    if (!raw) { setResumeModal(false); return; }
    try {
      const s = raw as Record<string, unknown>;
      setSessionQ((s.sessionQ as Question[]) || []);
      setQIndex((s.qIndex as number) || 0);
      setAnswers((s.answers as AnswerRecord[]) || []);
      setTimerDuration((s.timerDuration as number) || 0);
      setSelectedTopic((s.selectedTopic as string) || "Все темы");
      setMode((s.mode as "topic" | "random") || "topic");
      setSelected((s.currentSelected as number | null) ?? null);
      setTimeLeft((s.timerDuration as number) || 0);
      setView("question");
    } catch {}
    setResumeModal(false);
  };

  const restartSession = () => {
    lsRemove("theory_session");
    setResumeModal(false);
  };

  const handleExit = () => {
    clearInterval(timerRef.current!);
    lsRemove("theory_session");
    setSelected(null);
    setView("start");
    setConfirmExit(false);
  };

  const start = async () => {
    setView("loading");
    setLoadError(null);
    lsRemove("theory_session");
    try {
      const topic = selectedTopic === "Все темы"
        ? TOPICS_LIST[Math.floor(Math.random() * (TOPICS_LIST.length - 1)) + 1]
        : selectedTopic;
      const qs = (await generateQuestions(topic, SESSION_COUNT, 1)) as Question[];
      if (qs.length === 0) throw new Error("Нет вопросов");
      const pool = mode === "random" ? [...qs].sort(() => Math.random() - 0.5) : qs;
      setSessionQ(pool);
      setQIndex(0);
      setSelected(null);
      setAnswers([]);
      setTimeLeft(timerDuration);
      setView("question");
    } catch {
      setLoadError("Не удалось загрузить вопросы. Проверь интернет-соединение.");
      setView("start");
    }
  };

  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    clearInterval(timerRef.current!);
    saveSession({ currentSelected: idx });
  };

  const handleNext = (timeout = false) => {
    const q = sessionQ[qIndex];
    const correct = !timeout && selected === q.correct;
    const newAnswers = [...answers, { correct, topic: q.topic }];
    const isLast = qIndex + 1 >= sessionQ.length;
    const nextIndex = qIndex + 1;

    if (!isLast) {
      saveSession({ qIndex: nextIndex, answers: newAnswers, currentSelected: null });
    }

    const proceed = () => {
      setAnswers(newAnswers);
      if (isLast) {
        lsRemove("theory_session");
        const byTopic: Record<string, { correct: number; total: number }> = {};
        newAnswers.forEach(({ topic, correct: c }) => {
          if (!byTopic[topic]) byTopic[topic] = { correct: 0, total: 0 };
          byTopic[topic].total += 1;
          if (c) byTopic[topic].correct += 1;
        });
        Object.entries(byTopic).forEach(([t, { correct: c, total }]) => updateTopicStats(t, c, total));
        const correctCount = newAnswers.filter((a) => a.correct).length;
        addXP(correctCount * 10);
        incrementTodayDone(sessionQ.length);
        checkAchievements();
        setView("finished");
      } else {
        setSelected(null);
        setQIndex(nextIndex);
      }
    };

    if (timeout) {
      proceed();
    } else {
      setSelected(null);
      setTimeout(proceed, 320);
    }
  };

  const correctCount = answers.filter((a) => a.correct).length;
  const pct    = sessionQ.length > 0 ? Math.round((correctCount / sessionQ.length) * 100) : 0;
  const stars  = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
  const motivation = pct >= 80 ? "Отличная работа!" : pct >= 60 ? "Хороший результат!" : "Продолжай стараться!";

  const weakTopics = sessionQ.reduce<Record<string, number>>((acc, q, i) => {
    if (!answers[i]?.correct) acc[q.topic] = (acc[q.topic] || 0) + 1;
    return acc;
  }, {});

  // ── Loading ────────────────────────────────────────────────────────────────
  if (view === "loading") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center", gap: 16 }}>
      <ActivityIndicator size="large" color="#F97316" />
      <Text style={{ fontSize: 14, color: theme.muted }}>Загрузка вопросов...</Text>
    </SafeAreaView>
  );

  // ── Results ────────────────────────────────────────────────────────────────
  if (view === "finished") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 8, gap: 8 }}>
          <Text style={{ fontSize: 40, fontWeight: "800", color: theme.text }}>{correctCount} / {sessionQ.length}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Text key={i} style={{ fontSize: 26, color: "#F97316" }}>{i < stars ? "★" : "☆"}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>{motivation}</Text>
        </View>

        {Object.keys(weakTopics).length > 0 && (
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Слабые места:</Text>
            {Object.entries(weakTopics).map(([t, n]) => (
              <View key={t} style={s.row}>
                <Text style={{ fontSize: 13, color: theme.muted }}>{t}</Text>
                <Text style={{ fontSize: 13, color: "#EF4444" }}>{n} ошибок</Text>
              </View>
            ))}
          </View>
        )}

        <OrangeBtn label="Назад" onPress={() => setView("start")} />
        <OrangeBtn label="Ещё раз" onPress={start} outlined />
      </ScrollView>
    </SafeAreaView>
  );

  // ── Question ───────────────────────────────────────────────────────────────
  if (view === "question" && sessionQ[qIndex]) {
    const q = sessionQ[qIndex];
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Confirm exit modal */}
        <Modal transparent visible={confirmExit} animationType="fade">
          <View style={s.overlay}>
            <View style={[s.modal, { backgroundColor: theme.card }]}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Выйти из теории?</Text>
              <Text style={[s.modalSub, { color: theme.muted }]}>Прогресс не сохранится.</Text>
              <View style={s.modalBtns}>
                <TouchableOpacity onPress={() => setConfirmExit(false)} style={[s.modalBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.muted, fontWeight: "600" }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleExit} style={[s.modalBtn, { backgroundColor: "#EF4444", borderColor: "#EF4444" }]}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Выйти</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
          {/* Header row */}
          <View style={[s.row, { paddingTop: 4 }]}>
            <TouchableOpacity onPress={() => setConfirmExit(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 18, color: theme.muted }}>✕</Text>
              <Text style={{ fontSize: 13, color: theme.muted }}>Выйти</Text>
            </TouchableOpacity>
            {timerDuration > 0 && (
              <Text style={{ fontSize: 18, fontWeight: "700", color: timeLeft < 10 ? "#EF4444" : theme.text }}>
                {formatTime(timeLeft)}
              </Text>
            )}
            <Text style={{ fontSize: 11, color: theme.muted }}>Вопрос {qIndex + 1}/{sessionQ.length}</Text>
          </View>

          <ProgressBar value={qIndex + 1} max={sessionQ.length} />

          {/* Question card */}
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: "#F97316", textTransform: "uppercase", marginBottom: 6 }}>
              {q.topic}
            </Text>
            <Text style={{ fontSize: 15, lineHeight: 22, color: theme.text }}>{q.text}</Text>
          </View>

          {/* Answer options */}
          {q.options.map((opt, idx) => {
            const text = opt.replace(/^[АБВГД][:.]\s*/u, "");
            let bg = theme.card, border = theme.border, fg = theme.text, badge = null as null | string;
            if (selected !== null) {
              if (idx === q.correct)    { bg = "#F0FDF4"; border = "#22C55E"; fg = "#15803D"; badge = "✓"; }
              else if (idx === selected){ bg = "#FEF2F2"; border = "#EF4444"; fg = "#B91C1C"; badge = "✕"; }
            }
            return (
              <TouchableOpacity key={idx} onPress={() => handleSelect(idx)} activeOpacity={0.85}
                style={[s.optBtn, { backgroundColor: bg, borderColor: border }]}>
                <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: fg, textAlign: "center" }}>
                  <Text style={{ fontWeight: "700" }}>{LABELS[idx]})</Text>{" "}{text}
                </Text>
                {badge && (
                  <View style={{
                    width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center",
                    backgroundColor: badge === "✓" ? "#22C55E" : "#EF4444",
                  }}>
                    <Text style={{ color: "#fff", fontWeight: "700" }}>{badge}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Explanation panel */}
          {selected !== null && (q.formula || q.explanation) && (
            <View style={{ backgroundColor: "#FFFBEB", borderColor: "#FDE68A", borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 }}>
              {q.formula && (
                <View style={{ backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 12, padding: 10 }}>
                  <Text style={{ fontFamily: "monospace", fontSize: 15, fontWeight: "700", color: "#F97316", textAlign: "center" }}>
                    {q.formula}
                  </Text>
                </View>
              )}
              {q.explanation && (
                <Text style={{ fontSize: 13, lineHeight: 20, color: "#92400E" }}>
                  {q.explanation}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* Next button — shown after selection */}
        {selected !== null && (
          <View style={[s.nextBar, { backgroundColor: theme.bg }]}>
            <TouchableOpacity onPress={() => handleNext()} activeOpacity={0.85}
              style={{ backgroundColor: "#F97316", borderRadius: 16, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
                {qIndex + 1 >= sessionQ.length ? "Завершить →" : "Следующий →"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── Start screen ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Resume modal */}
      <Modal transparent visible={resumeModal} animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Незавершённый тест по теории</Text>
            <Text style={[s.modalSub, { color: theme.muted }]}>Продолжить с того места или начать заново?</Text>
            <TouchableOpacity onPress={continueSession}
              style={{ backgroundColor: "#F97316", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 4 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Продолжить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={restartSession}
              style={{ borderRadius: 12, borderWidth: 1, borderColor: theme.border, paddingVertical: 12, alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: theme.muted, fontWeight: "600", fontSize: 14 }}>Начать заново</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.text, paddingTop: 4 }}>Теория</Text>

        {loadError && (
          <View style={{ backgroundColor: "#FEF2F2", borderRadius: 16, padding: 14 }}>
            <Text style={{ fontSize: 13, color: "#B91C1C" }}>{loadError}</Text>
          </View>
        )}

        {/* Topic picker */}
        <View>
          <TouchableOpacity onPress={() => setTopicOpen((o) => !o)} activeOpacity={0.85}
            style={[s.picker, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ fontSize: 14, color: theme.text }}>{selectedTopic}</Text>
            <Text style={{ fontSize: 12, color: theme.muted }}>{topicOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {topicOpen && (
            <View style={[s.dropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {TOPICS_LIST.map((t) => (
                <TouchableOpacity key={t} onPress={() => { setSelectedTopic(t); setTopicOpen(false); }}
                  style={[s.dropItem, { borderColor: theme.border, backgroundColor: t === selectedTopic ? "#FFF7ED" : theme.card }]}>
                  <Text style={{ fontSize: 14, color: t === selectedTopic ? "#F97316" : theme.text }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Mode toggle */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {([{ id: "topic", label: "По теме" }, { id: "random", label: "Случайные" }] as const).map((m) => (
            <TouchableOpacity key={m.id} onPress={() => setMode(m.id)} activeOpacity={0.85}
              style={{
                flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center",
                backgroundColor: mode === m.id ? "#F97316" : theme.card,
                borderWidth: 1, borderColor: mode === m.id ? "#F97316" : theme.border,
              }}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: mode === m.id ? "#fff" : theme.muted }}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Timer options */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, color: theme.muted }}>Таймер на вопрос</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {TIMER_OPTIONS.map((opt) => (
              <TouchableOpacity key={opt.value} onPress={() => setTimerDuration(opt.value)} activeOpacity={0.85}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center",
                  backgroundColor: timerDuration === opt.value ? "#F97316" : theme.card,
                  borderWidth: 1, borderColor: timerDuration === opt.value ? "#F97316" : theme.border,
                }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: timerDuration === opt.value ? "#fff" : theme.muted }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <OrangeBtn label="Начать →" onPress={start} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card:     { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle:{ fontSize: 13, fontWeight: "700", marginBottom: 8 },
  row:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  optBtn:   { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, gap: 8, minHeight: 52 },
  picker:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 13, borderRadius: 16, borderWidth: 1 },
  dropdown: { borderRadius: 16, borderWidth: 1, marginTop: 4, overflow: "hidden", zIndex: 10 },
  dropItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  overlay:  { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modal:    { width: "100%", borderRadius: 20, padding: 24, gap: 8 },
  modalTitle:{ fontSize: 16, fontWeight: "700" },
  modalSub: { fontSize: 13, marginBottom: 4 },
  modalBtns:{ flexDirection: "row", gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  nextBar:  { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 24 },
});
