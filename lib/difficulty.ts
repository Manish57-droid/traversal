import type { QuestionDifficulty } from "@/types";

// Display-only labels — the stored enum value is never renamed
// ('medium' stays 'medium' in the DB), only shown differently.
export const DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  easy: "Easy",
  medium: "Intermediate",
  hard: "Hard",
  unknown: "Unspecified",
};

/** The three difficulty values exposed as filter options — "unknown"
 * isn't a real difficulty choice, so it's excluded from filter UIs
 * (rows with unknown difficulty simply show up when no filter is set). */
export const FILTERABLE_DIFFICULTIES: Exclude<QuestionDifficulty, "unknown">[] = ["easy", "medium", "hard"];

// Badge styling for a difficulty pill — shared wherever a question row
// needs one (previously each page hand-rolled its own plain text).
export const DIFFICULTY_BADGE_STYLE: Record<QuestionDifficulty, string> = {
  easy: "border-success/40 bg-success/10 text-success",
  medium: "border-warn/40 bg-warn/10 text-warn",
  hard: "border-red-400/40 bg-red-400/10 text-red-400",
  unknown: "border-line/70 text-fg-muted",
};
