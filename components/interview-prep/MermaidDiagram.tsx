"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Reads a live theme token (e.g. "--accent") as an "r, g, b" triple
// (see app/globals.css) and hands mermaid a real rgb() string — mermaid's
// themeVariables need concrete colors, not CSS custom properties, so
// this is what keeps diagrams matching the app's light/dark palette
// instead of shipping a fixed color set that fights the current theme.
function readColor(varName: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  return raw ? `rgb(${raw.replace(/\s+/g, ", ")})` : fallback;
}

// Renders one ```mermaid fenced block (from AnswerContent) as an
// inline SVG diagram. Mermaid is dynamically imported client-side only
// — it's a large library and every render call already happens inside
// a "use client" component, so there's no SSR path to protect, just a
// bundle-splitting one.
export default function MermaidDiagram({ chart }: { chart: string }) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { default: mermaid } = await import("mermaid");

      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: {
          background: readColor("--surface", "#101B14"),
          primaryColor: readColor("--surface-2", "#17251C"),
          primaryTextColor: readColor("--fg", "#ECE9E1"),
          primaryBorderColor: readColor("--accent", "#D9824C"),
          lineColor: readColor("--fg-muted", "#A8B2A8"),
          secondaryColor: readColor("--surface-2", "#17251C"),
          tertiaryColor: readColor("--surface", "#101B14"),
          textColor: readColor("--fg", "#ECE9E1"),
          mainBkg: readColor("--surface-2", "#17251C"),
          nodeBorder: readColor("--accent", "#D9824C"),
          clusterBkg: readColor("--surface", "#101B14"),
          clusterBorder: readColor("--line", "#2E4033"),
          edgeLabelBackground: readColor("--surface", "#101B14"),
          fontSize: "13px",
          actorBkg: readColor("--surface-2", "#17251C"),
          actorBorder: readColor("--accent", "#D9824C"),
          actorTextColor: readColor("--fg", "#ECE9E1"),
          actorLineColor: readColor("--fg-muted", "#A8B2A8"),
          signalColor: readColor("--fg-muted", "#A8B2A8"),
          signalTextColor: readColor("--fg", "#ECE9E1"),
          labelBoxBkgColor: readColor("--surface-2", "#17251C"),
          labelBoxBorderColor: readColor("--accent", "#D9824C"),
          labelTextColor: readColor("--fg", "#ECE9E1"),
          loopTextColor: readColor("--fg", "#ECE9E1"),
          noteBkgColor: readColor("--surface-2", "#17251C"),
          noteBorderColor: readColor("--line", "#2E4033"),
          noteTextColor: readColor("--fg-muted", "#A8B2A8"),
          taskBkgColor: readColor("--surface-2", "#17251C"),
          taskBorderColor: readColor("--accent", "#D9824C"),
          taskTextColor: readColor("--fg", "#ECE9E1"),
          activeTaskBkgColor: readColor("--accent", "#D9824C"),
          activeTaskBorderColor: readColor("--accent-2", "#F2A876"),
        },
      });

      try {
        const { svg: rendered } = await mermaid.render(`mmd-${rawId}`, chart.trim());
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // resolvedTheme is a dependency purely to force a re-render (with
    // freshly-read colors) when the user flips light/dark.
  }, [chart, rawId, resolvedTheme]);

  if (failed) return null;

  if (!svg) {
    return <div className="my-4 h-32 animate-pulse rounded-lg border border-line/60 bg-surface-2" />;
  }

  return (
    <div
      ref={ref}
      className="my-4 overflow-x-auto rounded-lg border border-line/60 bg-surface/40 p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
