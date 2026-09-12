"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { THEME_KEY } from "./theme";

type Preference = "system" | "light" | "dark";
const CHANGE = "dp-theme-change";

function applyTheme(preference: Preference) {
  const root = document.documentElement;
  const dark = preference === "dark" ||
    (preference === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.themePreference = preference;
  window.dispatchEvent(new Event(CHANGE));
}

function chooseTheme(preference: Preference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, preference);
  } catch { /* The current tab can still switch when storage is blocked. */ }
  applyTheme(preference);
}

function subscribe(notify: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    if (document.documentElement.dataset.themePreference === "system") applyTheme("system");
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    applyTheme(event.newValue === "light" || event.newValue === "dark" ? event.newValue : "system");
  };
  window.addEventListener(CHANGE, notify);
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onSystemChange);
  // Catch an OS change between the pre-paint script and hydration.
  onSystemChange();
  return () => {
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onSystemChange);
  };
}

function snapshot() {
  const root = document.documentElement;
  return `${root.dataset.themePreference ?? "system"}:${root.classList.contains("dark") ? "dark" : "light"}`;
}
const serverSnapshot = () => "system:light";

/** OS by default; explicit overrides persist across pages, reloads, and tabs. */
export function ThemeToggle() {
  const [preference, theme] = useSyncExternalStore(subscribe, snapshot, serverSnapshot).split(":");
  const next = theme === "dark" ? "light" : "dark";
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Appearance">
      <Button variant="ghost" size="sm" onClick={() => chooseTheme(next)}
        aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`} className="gap-1.5">
        <Sun className="hidden dark:block" aria-hidden />
        <Moon className="dark:hidden" aria-hidden />
        <span>{next === "dark" ? "Dark" : "Light"}</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => chooseTheme("system")}
        aria-label="Use system theme" aria-pressed={preference === "system"}
        title="Use system theme" className={preference === "system" ? "gap-1.5 text-brand" : "gap-1.5 text-muted-foreground"}>
        <Monitor aria-hidden />
        <span>System</span>
      </Button>
    </div>
  );
}
