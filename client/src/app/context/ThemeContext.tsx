"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type ThemePreference = "dark" | "light" | "system";

interface ThemeContextType {
  preference: ThemePreference;
  effective: "dark" | "light";
  setPreference: (p: ThemePreference) => void;
}

const THEME_KEY = "sage_theme";

function getSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preference: ThemePreference): "dark" | "light" {
  const effective = preference === "system" ? getSystemTheme() : preference;
  document.documentElement.setAttribute("data-theme", effective);
  return effective;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");
  const [effective, setEffective] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const stored = (localStorage.getItem(THEME_KEY) as ThemePreference) ?? "dark";
    setPreferenceState(stored);
    setEffective(applyTheme(stored));
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setEffective(applyTheme("system"));
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = useCallback((p: ThemePreference) => {
    localStorage.setItem(THEME_KEY, p);
    setPreferenceState(p);
    setEffective(applyTheme(p));
  }, []);

  const value = useMemo(
    () => ({ preference, effective, setPreference }),
    [preference, effective, setPreference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
