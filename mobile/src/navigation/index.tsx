import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import { useTheme } from "@/context/ThemeContext";
import {
  RootTabParamList,
  DashboardStackParamList,
  TasksStackParamList,
  FormulasStackParamList,
  ProgressStackParamList,
  SettingsStackParamList,
} from "./types";

import DashboardScreen from "@/screens/Dashboard";
import TasksScreen from "@/screens/Tasks";
import FormulasScreen from "@/screens/FormulaCards";
import ProgressScreen from "@/screens/Progress";
import SettingsScreen from "@/screens/Settings";

const Tab = createBottomTabNavigator<RootTabParamList>();

// ── Per-tab stacks ─────────────────────────────────────────────────────────

const DashboardStack = createNativeStackNavigator<DashboardStackParamList>();
function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
    </DashboardStack.Navigator>
  );
}

const TasksStack = createNativeStackNavigator<TasksStackParamList>();
function TasksNavigator() {
  return (
    <TasksStack.Navigator screenOptions={{ headerShown: false }}>
      <TasksStack.Screen name="TasksHome" component={TasksScreen} />
    </TasksStack.Navigator>
  );
}

const FormulasStack = createNativeStackNavigator<FormulasStackParamList>();
function FormulasNavigator() {
  return (
    <FormulasStack.Navigator screenOptions={{ headerShown: false }}>
      <FormulasStack.Screen name="FormulasHome" component={FormulasScreen} />
    </FormulasStack.Navigator>
  );
}

const ProgressStack = createNativeStackNavigator<ProgressStackParamList>();
function ProgressNavigator() {
  return (
    <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgressStack.Screen name="ProgressHome" component={ProgressScreen} />
    </ProgressStack.Navigator>
  );
}

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();
function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

// ── Tab icon helper ────────────────────────────────────────────────────────
// Placeholder text icons — replace with vector icons in M2.

function TabIcon({ label, color }: { label: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}

// ── Root tab navigator ─────────────────────────────────────────────────────

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
          tabBarIcon: ({ color }) => <TabIcon label="🏠" color={color} />,
        }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksNavigator}
        options={{
          tabBarLabel: "Задачи",
          tabBarIcon: ({ color }) => <TabIcon label="📝" color={color} />,
        }}
      />
      <Tab.Screen
        name="Formulas"
        component={FormulasNavigator}
        options={{
          tabBarLabel: "Формулы",
          tabBarIcon: ({ color }) => <TabIcon label="∑" color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressNavigator}
        options={{
          tabBarLabel: "Прогресс",
          tabBarIcon: ({ color }) => <TabIcon label="📊" color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          tabBarLabel: "Настройки",
          tabBarIcon: ({ color }) => <TabIcon label="⚙" color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
