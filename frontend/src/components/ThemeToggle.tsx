import { useEffect, useState } from "react";

import { IconMoon, IconSun } from "@/components/icons";

const STORAGE_KEY = "tellmewhy.theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    applyTheme(isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={() => setIsDark((v) => !v)}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 ${className}`}
    >
      {isDark ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
    </button>
  );
}
