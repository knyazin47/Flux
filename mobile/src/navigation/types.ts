import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

// ── Tab param lists ────────────────────────────────────────────────────────

// Dashboard stack: Home + secondary screens accessible via quick access
export type DashboardStackParamList = {
  DashboardHome: undefined;
  FormulaCards: undefined;
  Cheatsheet: undefined;
  MockExam: undefined;
};

export type TasksStackParamList = {
  TasksHome: undefined;
};

export type TheoryStackParamList = {
  TheoryHome: undefined;
};

export type ProgressStackParamList = {
  ProgressHome: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
};

// ── Root tab param list — matches web nav ──────────────────────────────────

export type RootTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Theory: undefined;
  Progress: undefined;
  Settings: undefined;
};

// ── Screen prop helpers ────────────────────────────────────────────────────

export type DashboardHomeProps  = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;
export type FormulaCardsProps   = NativeStackScreenProps<DashboardStackParamList, "FormulaCards">;
export type CheatsheetProps     = NativeStackScreenProps<DashboardStackParamList, "Cheatsheet">;
export type MockExamProps       = NativeStackScreenProps<DashboardStackParamList, "MockExam">;
export type TasksHomeProps      = NativeStackScreenProps<TasksStackParamList,     "TasksHome">;
export type TheoryHomeProps     = NativeStackScreenProps<TheoryStackParamList,    "TheoryHome">;
export type ProgressHomeProps   = NativeStackScreenProps<ProgressStackParamList,  "ProgressHome">;
export type SettingsHomeProps   = NativeStackScreenProps<SettingsStackParamList,  "SettingsHome">;
