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
