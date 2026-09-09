"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

// Sun/moon toggle for the public landing page. Renders a neutral
// placeholder until mounted so the server-rendered markup (which has
// no idea what the visitor's stored preference is) never mismatches
// the client render — the standard next-themes hydration pattern.
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? `Switch to ${isDark ? "light" : "dark"} mode` : "Toggle theme"}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full
        border border-line text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
    >
      <Sun
        className={`absolute h-4 w-4 transition-all duration-300 ease-out ${
          mounted && isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`absolute h-4 w-4 transition-all duration-300 ease-out ${
          mounted && isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
