import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

// ── Tab param lists ────────────────────────────────────────────────────────

export type DashboardStackParamList = {
  DashboardHome: undefined;
};

export type TasksStackParamList = {
  TasksHome: undefined;
};

export type FormulasStackParamList = {
  FormulasHome: undefined;
};

export type ProgressStackParamList = {
  ProgressHome: undefined;
};

export type SettingsStackParamList = {
  SettingsHome: undefined;
};

// ── Root tab param list ────────────────────────────────────────────────────

export type RootTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Formulas: undefined;
  Progress: undefined;
  Settings: undefined;
};

// ── Screen prop helpers ────────────────────────────────────────────────────

export type DashboardHomeProps = NativeStackScreenProps<DashboardStackParamList, "DashboardHome">;
export type TasksHomeProps = NativeStackScreenProps<TasksStackParamList, "TasksHome">;
export type FormulasHomeProps = NativeStackScreenProps<FormulasStackParamList, "FormulasHome">;
export type ProgressHomeProps = NativeStackScreenProps<ProgressStackParamList, "ProgressHome">;
export type SettingsHomeProps = NativeStackScreenProps<SettingsStackParamList, "SettingsHome">;
