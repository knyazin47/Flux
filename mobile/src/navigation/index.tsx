import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/context/ThemeContext";
import {
  RootTabParamList,
  DashboardStackParamList,
  TasksStackParamList,
  TheoryStackParamList,
  ProgressStackParamList,
  SettingsStackParamList,
} from "./types";

import DashboardScreen    from "@/screens/Dashboard";
import TasksScreen        from "@/screens/Tasks";
import FormulaCardsScreen from "@/screens/FormulaCards";
import CheatsheetScreen   from "@/screens/Cheatsheet";
import MockExamScreen     from "@/screens/MockExam";
import TheoryScreen       from "@/screens/Theory";
import ProgressScreen     from "@/screens/Progress";
import SettingsScreen     from "@/screens/Settings";

const Tab = createBottomTabNavigator<RootTabParamList>();

// ── Shared header options factory ──────────────────────────────────────────

function headerOpts(theme: ReturnType<typeof useTheme>["theme"]) {
  return {
    headerStyle: { backgroundColor: theme.card },
    headerTintColor: theme.text,
    headerTitleStyle: { fontWeight: "700" as const, fontSize: 17 },
    headerShadowVisible: false,
  };
}

// ── Per-tab stacks ─────────────────────────────────────────────────────────

// Dashboard stack also hosts secondary screens: FormulaCards, Cheatsheet, MockExam
const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
function DashboardNavigator() {
  const { theme } = useTheme();
  return (
    <DashboardStack.Navigator screenOptions={{ ...headerOpts(theme) }}>
      <DashboardStack.Screen
        name="DashboardHome"
        component={DashboardScreen}
        options={{ headerShown: false }}
      />
      <DashboardStack.Screen
        name="FormulaCards"
        component={FormulaCardsScreen}
        options={{ title: "Формулы" }}
      />
      <DashboardStack.Screen
        name="Cheatsheet"
        component={CheatsheetScreen}
        options={{ title: "Шпаргалка" }}
      />
      <DashboardStack.Screen
        name="MockExam"
        component={MockExamScreen}
        options={{ title: "Пробный экзамен" }}
      />
    </DashboardStack.Navigator>
  );
}

const TasksStack = createNativeStackNavigator<TasksStackParamList>();
function TasksNavigator() {
  const { theme } = useTheme();
  return (
    <TasksStack.Navigator screenOptions={{ ...headerOpts(theme) }}>
      <TasksStack.Screen
        name="TasksHome"
        component={TasksScreen}
        options={{ title: "Задания" }}
      />
    </TasksStack.Navigator>
  );
}

const TheoryStack = createNativeStackNavigator<TheoryStackParamList>();
function TheoryNavigator() {
  const { theme } = useTheme();
  return (
    <TheoryStack.Navigator screenOptions={{ ...headerOpts(theme) }}>
      <TheoryStack.Screen
        name="TheoryHome"
        component={TheoryScreen}
        options={{ title: "Теория" }}
      />
    </TheoryStack.Navigator>
  );
}

const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
function ProgressNavigator() {
  const { theme } = useTheme();
  return (
    <ProgressStack.Navigator screenOptions={{ ...headerOpts(theme) }}>
      <ProgressStack.Screen
        name="ProgressHome"
        component={ProgressScreen}
        options={{ title: "Прогресс" }}
      />
    </ProgressStack.Navigator>
  );
}

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
function SettingsNavigator() {
  const { theme } = useTheme();
  return (
    <SettingsStack.Navigator screenOptions={{ ...headerOpts(theme) }}>
      <SettingsStack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ title: "Настройки" }}
      />
    </SettingsStack.Navigator>
  );
}

// ── Tab icon helper ────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({ name, focused, color }: { name: IoniconName; focused: boolean; color: string }) {
  return <Ionicons name={focused ? name : `${name}-outline` as IoniconName} size={22} color={color} />;
}

// ── Root tab navigator — matches web nav exactly ───────────────────────────

export function RootNavigator() {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.card,
          borderTopColor: theme.border,
          height: 64,
        },
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500", marginBottom: 6 },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardNavigator}
        options={{
          tabBarLabel: "Главная",
          tabBarIcon: ({ focused, color }) => <TabIcon name="home" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksNavigator}
        options={{
          tabBarLabel: "Задания",
          tabBarIcon: ({ focused, color }) => <TabIcon name="document-text" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Theory"
        component={TheoryNavigator}
        options={{
          tabBarLabel: "Теория",
          tabBarIcon: ({ focused, color }) => <TabIcon name="school" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressNavigator}
        options={{
          tabBarLabel: "Прогресс",
          tabBarIcon: ({ focused, color }) => <TabIcon name="bar-chart" focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: "Ещё",
          tabBarIcon: ({ focused, color }) => <TabIcon name="ellipsis-horizontal" focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
