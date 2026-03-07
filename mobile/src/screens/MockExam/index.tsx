import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, ActivityIndicator, StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { lsGet, lsSet, lsRemove, addXP, addRtResult, updateTopicStats } from "@/utils/storage";
import { generateQuestions } from "@/utils/generateQuestions";
import type { MockExamProps } from "@/navigation/types";

// ── constants ─────────────────────────────────────────────────────────────────

const TOPICS = [
  "Механика", "Молекулярная физика", "Термодинамика",
  "Электростатика", "Постоянный ток", "Электромагнетизм",
  "Колебания и волны", "Оптика", "Квантовая и ядерная физика",
];
const LABELS = ["А", "Б", "В", "Г", "Д"];

type Question = {
  topic: string;
  text: string;
  options: string[];
  correct: number;
};

function barColor(pct: number) {
  return pct >= 70 ? "#22C55E" : pct >= 50 ? "#EAB308" : pct >= 30 ? "#F97316" : "#EF4444";
}

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// ── session persistence ───────────────────────────────────────────────────────

type ExamSession = {
  questions:      Question[];
  qIndex:         number;
  userAnswers:    Record<number, number>;
  flagged:        number[];
  format:         "full" | "mini";
  selectedTopics: string[];
  timeLeft:       number;
};

function saveSession(data: ExamSession) {
  lsSet("exam_session", data);
}

function loadSession(): ExamSession | null {
  const raw = lsGet("exam_session", null);
  if (!raw) return null;
  return raw as ExamSession;
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
        flex: outlined ? 1 : undefined,
        paddingVertical: 13, borderRadius: 16, alignItems: "center",
        backgroundColor: outlined ? "transparent" : disabled ? "#FDA975" : "#F97316",
        borderWidth: outlined ? 2 : 0, borderColor: "#F97316",
      }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: outlined ? "#F97316" : "#fff" }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function MockExamScreen(_props: MockExamProps) {
  const { theme } = useTheme();

  const [view,           setView]           = useState<"format" | "exam" | "results">("format");
  const [format,         setFormat]         = useState<"full" | "mini">("full");
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set(TOPICS));
  const [questions,      setQuestions]      = useState<Question[]>([]);
  const [qIndex,         setQIndex]         = useState(0);
  const [userAnswers,    setUserAnswers]     = useState<Record<number, number>>({});
  const [flagged,        setFlagged]        = useState<Set<number>>(new Set());
  const [timeLeft,       setTimeLeft]       = useState(0);
  const [confirmExit,    setConfirmExit]    = useState(false);
  const [showErrors,     setShowErrors]     = useState(false);
  const [saveModal,      setSaveModal]      = useState(false);
  const [loading,        setLoading]        = useState(false);
  const [resumeModal,    setResumeModal]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalQ    = format === "full" ? 30 : 10;
  const totalTime = format === "full" ? 90 * 60 : 30 * 60;

  // Check for saved session on focus
  useFocusEffect(
    React.useCallback(() => {
      if (view === "format" && lsGet("exam_session", null)) {
        setResumeModal(true);
      }
    }, [view])
  );

  useEffect(() => () => clearInterval(timerRef.current!), []);

  // Persist stats on results
  useEffect(() => {
    if (view !== "results" || questions.length === 0) return;
    lsRemove("exam_session");
    const stats: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, i) => {
      const t = q.topic || "Другое";
      if (!stats[t]) stats[t] = { correct: 0, total: 0 };
      stats[t].total += 1;
      if (userAnswers[i] === q.correct) stats[t].correct += 1;
    });
    Object.entries(stats).forEach(([t, { correct, total }]) => updateTopicStats(t, correct, total));
    const correct = questions.filter((q, i) => userAnswers[i] === q.correct).length;
    addXP(correct * (format === "full" ? 5 : 10));
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = () => {
    clearInterval(timerRef.current!);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); setView("results"); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const startExam = async () => {
    setLoading(true);
    lsRemove("exam_session");
    try {
      const perTopic = Math.ceil(totalQ / selectedTopics.size);
      const batches = await Promise.all(
        [...selectedTopics].map((topic) => generateQuestions(topic, perTopic, 2))
      );
      const pool = (batches.flat() as Question[]).sort(() => Math.random() - 0.5).slice(0, totalQ);
      setQuestions(pool);
      setQIndex(0);
      setUserAnswers({});
      setFlagged(new Set());
      setTimeLeft(totalTime);
      setView("exam");
      startTimer();
    } finally {
      setLoading(false);
    }
  };

  const continueSession = () => {
    const s = loadSession();
    if (!s) { setResumeModal(false); return; }
    setQuestions(s.questions);
    setQIndex(s.qIndex || 0);
    setUserAnswers(s.userAnswers || {});
    setFlagged(new Set(s.flagged || []));
    setFormat(s.format || "full");
    setSelectedTopics(new Set(s.selectedTopics || TOPICS));
    setTimeLeft(s.timeLeft || 0);
    setView("exam");
    setResumeModal(false);
    startTimer();
  };

  const restartSession = () => {
    lsRemove("exam_session");
    setResumeModal(false);
  };

  const handleAnswer = (idx: number) => {
    if (userAnswers[qIndex] !== undefined) return;
    const newAnswers = { ...userAnswers, [qIndex]: idx };
    setUserAnswers(newAnswers);
    saveSession({ questions, qIndex, userAnswers: newAnswers, flagged: [...flagged], format, selectedTopics: [...selectedTopics], timeLeft });
    setTimeout(() => {
      if (qIndex + 1 < questions.length) setQIndex((i) => i + 1);
      else { clearInterval(timerRef.current!); setView("results"); }
    }, 300);
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const n = new Set(prev);
      n.has(qIndex) ? n.delete(qIndex) : n.add(qIndex);
      saveSession({ questions, qIndex, userAnswers, flagged: [...n], format, selectedTopics: [...selectedTopics], timeLeft });
      return n;
    });
  };

  const toggleTopic = (t: string) => {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const correctCount = questions.filter((q, i) => userAnswers[i] === q.correct).length;
  const pct    = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const stars  = pct >= 90 ? 5 : pct >= 70 ? 4 : pct >= 50 ? 3 : pct >= 30 ? 2 : 1;
  const motivation = pct >= 80 ? "Отличная работа!" : pct >= 60 ? "Хороший результат!" : "Продолжай стараться!";

  const topicResults = TOPICS.map((t) => {
    const tqs = questions.filter((q) => q.topic === t);
    const correct = tqs.filter((q) => userAnswers[questions.indexOf(q)] === q.correct).length;
    return { name: t, correct, total: tqs.length, pct: tqs.length > 0 ? Math.round((correct / tqs.length) * 100) : null };
  }).filter((t) => t.total > 0);

  const flaggedList  = [...flagged].map((i) => ({ index: i, q: questions[i] })).filter((f) => f.q);
  const wrongList    = questions.map((q, i) => ({ i, q })).filter(({ i, q }) => userAnswers[i] !== undefined && userAnswers[i] !== q.correct);

  // ── View: format selection ────────────────────────────────────────────────
  if (view === "format") return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Resume modal */}
      <Modal transparent visible={resumeModal} animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Незавершённый экзамен</Text>
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
        <Text style={{ fontSize: 20, fontWeight: "800", color: theme.text, paddingTop: 4 }}>Пробный экзамен</Text>

        {/* Format cards */}
        {([
          { id: "full" as const, title: "Полный тест",  sub: "30 вопросов • 90 минут", sub2: "Все темы физики" },
          { id: "mini" as const, title: "Мини-тест",    sub: "10 вопросов • 30 минут", sub2: "Быстрая проверка" },
        ]).map((f) => (
          <TouchableOpacity key={f.id} onPress={() => setFormat(f.id)} activeOpacity={0.85}
            style={[s.fmtCard, { backgroundColor: format === f.id ? "#FFF7ED" : theme.card, borderColor: format === f.id ? "#F97316" : theme.border }]}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>{f.title}</Text>
              <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>{f.sub}</Text>
              <Text style={{ fontSize: 11, color: theme.muted }}>{f.sub2}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Topic selection */}
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: theme.muted }}>Выбрать темы:</Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              <TouchableOpacity onPress={() => setSelectedTopics(new Set(TOPICS))}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#F97316" }}>Выбрать все</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedTopics(new Set())}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.muted }}>Снять все</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TOPICS.map((t) => (
              <TouchableOpacity key={t} onPress={() => toggleTopic(t)} activeOpacity={0.85}
                style={{
                  paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1,
                  backgroundColor: selectedTopics.has(t) ? "#F97316" : theme.card,
                  borderColor: selectedTopics.has(t) ? "#F97316" : theme.border,
                }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: selectedTopics.has(t) ? "#fff" : theme.muted }}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 12 }}>
            <ActivityIndicator size="large" color="#F97316" />
            <Text style={{ marginTop: 8, fontSize: 13, color: theme.muted }}>Загрузка вопросов...</Text>
          </View>
        ) : (
          <OrangeBtn label="Начать экзамен" onPress={startExam} disabled={selectedTopics.size === 0} />
        )}
      </ScrollView>
    </SafeAreaView>
  );

  // ── View: exam in progress ────────────────────────────────────────────────
  if (view === "exam" && questions[qIndex]) {
    const q = questions[qIndex];
    const answered = userAnswers[qIndex] !== undefined;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Confirm exit modal */}
        <Modal transparent visible={confirmExit} animationType="fade">
          <View style={s.overlay}>
            <View style={[s.modal, { backgroundColor: theme.card }]}>
              <Text style={[s.modalTitle, { color: theme.text }]}>Выйти из экзамена?</Text>
              <Text style={[s.modalSub, { color: theme.muted }]}>Прогресс сохранится — можно будет продолжить.</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <TouchableOpacity onPress={() => setConfirmExit(false)}
                  style={[s.modalBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.muted, fontWeight: "600", fontSize: 13 }}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  clearInterval(timerRef.current!);
                  saveSession({ questions, qIndex, userAnswers, flagged: [...flagged], format, selectedTopics: [...selectedTopics], timeLeft });
                  setView("format");
                  setResumeModal(true);
                  setConfirmExit(false);
                }} style={[s.modalBtn, { backgroundColor: "#F97316", borderColor: "#F97316" }]}>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Сохранить и выйти</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }}>
          {/* Top row */}
          <View style={s.rowBetween}>
            <TouchableOpacity onPress={() => setConfirmExit(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 16, color: theme.muted }}>✕</Text>
              <Text style={{ fontSize: 13, color: theme.muted }}>Выйти</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: "700", color: timeLeft < 300 ? "#EF4444" : theme.text }}>
              {formatTime(timeLeft)}
            </Text>
            <Text style={{ fontSize: 11, color: theme.muted }}>Вопрос {qIndex + 1}/{questions.length}</Text>
          </View>

          <ProgressBar value={qIndex + 1} max={questions.length} />

          <Text style={{ fontSize: 15, lineHeight: 22, color: theme.text }}>{q.text}</Text>

          {/* Options */}
          {q.options.map((opt, idx) => {
            const text = opt.replace(/^[АБВГД][:.]\s*/u, "");
            return (
              <TouchableOpacity key={idx} onPress={() => handleAnswer(idx)} activeOpacity={0.85}
                style={[s.optBtn, { backgroundColor: theme.card, borderColor: answered && idx === userAnswers[qIndex] ? "#F97316" : theme.border }]}>
                <Text style={{ flex: 1, fontSize: 15, lineHeight: 20, color: theme.text, textAlign: "center" }}>
                  <Text style={{ fontWeight: "700" }}>{LABELS[idx]})</Text>{" "}{text}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Skip / Flag row */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity onPress={() => {
              if (qIndex + 1 < questions.length) setQIndex((i) => i + 1);
              else { clearInterval(timerRef.current!); setView("results"); }
            }} style={[s.actionBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: theme.muted }}>Пропустить</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleFlag}
              style={[s.actionBtn, { backgroundColor: theme.card, borderColor: flagged.has(qIndex) ? "#F97316" : theme.border }]}>
              <Text style={{ fontSize: 13, fontWeight: "600", color: flagged.has(qIndex) ? "#F97316" : theme.muted }}>
                Отметить
              </Text>
            </TouchableOpacity>
          </View>

          {/* Question nav dots */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
            {questions.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setQIndex(i)}
                style={{
                  width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center",
                  backgroundColor: i === qIndex ? "#F97316" : userAnswers[i] !== undefined ? "#FED7AA" : theme.border,
                  borderWidth: flagged.has(i) ? 2 : 0, borderColor: "#EF4444",
                }}>
                <Text style={{ fontSize: 9, fontWeight: "700", color: i === qIndex ? "#fff" : flagged.has(i) ? "#EF4444" : theme.muted }}>
                  {i + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── View: results ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Save modal */}
      <Modal transparent visible={saveModal} animationType="fade">
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: theme.card }]}>
            <Text style={[s.modalTitle, { color: theme.text }]}>Результат сохранён!</Text>
            <Text style={[s.modalSub, { color: theme.muted }]}>{format === "full" ? "Полный тест" : "Мини-тест"} • {pct}%</Text>
            <TouchableOpacity onPress={() => setSaveModal(false)}
              style={{ backgroundColor: "#F97316", borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 }}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}>
        {/* Score header */}
        <View style={{ alignItems: "center", paddingTop: 16, paddingBottom: 8, gap: 8 }}>
          <Text style={{ fontSize: 32, fontWeight: "800", color: theme.text }}>{correctCount} / {questions.length} • {pct}%</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <Text key={i} style={{ fontSize: 24, color: "#F97316" }}>{i < stars ? "★" : "☆"}</Text>
            ))}
          </View>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>{motivation}</Text>
          <View style={{ backgroundColor: "#F97316", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
              +{correctCount * (format === "full" ? 5 : 10)} XP
            </Text>
          </View>
        </View>

        {/* Per-topic results */}
        <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[s.cardTitle, { color: theme.text }]}>По темам</Text>
          {topicResults.map((t) => (
            <View key={t.name} style={{ marginBottom: 12 }}>
              <View style={s.rowBetween}>
                <Text style={{ fontSize: 12, color: theme.text }}>{t.name}</Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: barColor(t.pct!) }}>{t.correct}/{t.total} ({t.pct}%)</Text>
              </View>
              <View style={{ marginTop: 6, height: 8, borderRadius: 4, backgroundColor: theme.border }}>
                <View style={{ width: `${t.pct}%`, height: 8, borderRadius: 4, backgroundColor: barColor(t.pct!) }} />
              </View>
            </View>
          ))}
        </View>

        {/* Flagged questions */}
        {flaggedList.length > 0 && (
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Помеченные вопросы ({flaggedList.length})</Text>
            {flaggedList.map(({ index, q }) => (
              <View key={index} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 12, color: theme.muted }}>#{index + 1} {q.text.slice(0, 60)}...</Text>
              </View>
            ))}
          </View>
        )}

        {/* Error analysis */}
        {showErrors && wrongList.length > 0 && (
          <View style={[s.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[s.cardTitle, { color: theme.text }]}>Разбор ошибок</Text>
            {wrongList.map(({ i, q }) => (
              <View key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 12, color: theme.text, marginBottom: 6 }}>#{i + 1} {q.text}</Text>
                <Text style={{ fontSize: 12, color: "#EF4444" }}>Ваш ответ: {q.options[userAnswers[i]]}</Text>
                <Text style={{ fontSize: 12, color: "#22C55E" }}>Правильно: {q.options[q.correct]}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity onPress={() => setShowErrors((e) => !e)}
            style={[s.actionBtn, { flex: 1, borderColor: "#F97316", borderWidth: 2 }]}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#F97316" }}>
              {showErrors ? "Скрыть ошибки" : "Разбор ошибок"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {
            addRtResult({
              date: new Date().toISOString().slice(0, 10),
              type: format === "full" ? "Полный" : "Мини",
              score: pct,
              note: `${correctCount}/${questions.length}`,
            });
            setSaveModal(true);
          }} style={[s.actionBtn, { flex: 1, backgroundColor: "#F97316", borderColor: "#F97316" }]}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>Сохранить результат</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => setView("format")}>
          <Text style={{ fontSize: 13, textAlign: "center", color: theme.muted }}>Вернуться</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modal:      { width: "100%", borderRadius: 20, padding: 24, gap: 6 },
  modalTitle: { fontSize: 16, fontWeight: "700" },
  modalSub:   { fontSize: 13 },
  modalBtn:   { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  fmtCard:    { borderRadius: 16, borderWidth: 2, padding: 16 },
  card:       { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle:  { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  optBtn:     { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, minHeight: 52 },
  actionBtn:  { paddingVertical: 11, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
