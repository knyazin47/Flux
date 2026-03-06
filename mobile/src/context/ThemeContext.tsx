import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { lsGet, lsSet } from "@/utils/storage";

// Mirror the web CSS variable system with identical color tokens
export interface Theme {
  accent: string;
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  dark: boolean;
}

const lightTheme: Theme = {
  accent: "#F97316",
  bg: "#F8FAFC",
  card: "#FFFFFF",
  text: "#0F172A",
  muted: "#94A3B8",
  border: "#E2E8F0",
  dark: false,
};

const darkTheme: Theme = {
  accent: "#F97316",
  bg: "#0F172A",
  card: "#1E293B",
  text: "#F1F5F9",
  muted: "#64748B",
  border: "#334155",
  dark: true,
};

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setDark: (dark: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  toggleTheme: () => {},
  setDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = lsGet("theme", null);
    if (saved === "dark") return true;
    if (saved === "light") return false;
    // Fall back to system preference
    return Appearance.getColorScheme() === "dark";
  });

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      // Only follow system if no explicit user preference saved
      if (lsGet("theme", null) === null) {
        setIsDark(colorScheme === "dark");
      }
    });
    return () => sub.remove();
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      lsSet("theme", next ? "dark" : "light");
      return next;
    });
  };

  const setDark = (dark: boolean) => {
    lsSet("theme", dark ? "dark" : "light");
    setIsDark(dark);
  };

  return (
    <ThemeContext.Provider
      value={{ theme: isDark ? darkTheme : lightTheme, toggleTheme, setDark }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
