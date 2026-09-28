import type { LucideIcon } from "lucide-react";

// Same "icon in a tinted circle" pattern already used throughout this
// codebase (e.g. Features.tsx's bg-accent/10 text-accent icon boxes),
// keyed by token name rather than a raw class string so every tile is
// guaranteed a real, already-defined color pair — no risk of a typo'd
// or unsupported opacity-modified class slipping through.
const TINTS = {
  success: "bg-success/10 text-success",
  warn: "bg-warn/10 text-warn",
  accent: "bg-accent/10 text-accent",
  muted: "bg-surface-2 text-fg-muted",
} as const;

// Shared top-row metric tile for both dashboards, so they read as one
// consistent visual language instead of each hand-rolling its own
// plain-number card.
export default function StatTile({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  tint: keyof typeof TINTS;
}) {
  const [bgText, textOnly] = [TINTS[tint], TINTS[tint].split(" ")[1]];
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${bgText}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className={`font-display text-2xl leading-tight ${textOnly}`}>{value}</p>
        <p className="truncate text-xs text-fg-muted">{label}</p>
      </div>
    </div>
  );
}
