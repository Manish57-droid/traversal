"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Thin client wrapper around next-themes so the server-rendered root
// layout can stay a plain function component. This only ever ends up
// controlling the class on <html> (next-themes' documented pattern) —
// the public landing page is the one place that reacts to it; every
// other page is pinned to the dark palette via `.dark` on <body>
// itself (see app/layout.tsx and app/globals.css), so this toggle
// existing doesn't change how any authenticated page looks.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
