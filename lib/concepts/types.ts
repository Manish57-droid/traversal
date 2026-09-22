// Shared types for the "Topics" reading section. Each topic is a
// small, self-contained algorithm visualizer: a theory write-up, an
// interactive input form, a pure `generateSteps` function that turns
// that input into a step-by-step animation, and a short recap quiz.
// `steps` on a topic is that function pre-run once against
// `defaultInput` — the canned example every topic ships with — so
// nothing about the existing walkthrough changes; `generateSteps` is
// what lets a student re-run the same walkthrough on their own input.

export interface ConceptTheory {
  definition: string;
  operations: { name: string; complexity: string }[];
  useCases: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Step<TState> {
  title: string;
  description: string;
  state: TState;
}

/** Raw string values keyed by an InputFieldSpec's `key` — exactly what
 * a <form> gives you, parsed by each topic's own `generateSteps`. */
export type TopicInput = Record<string, string>;

export type InputFieldSpec =
  | { key: string; label: string; type: "numberList"; placeholder: string; help: string }
  | { key: string; label: string; type: "number"; placeholder: string; help: string }
  | { key: string; label: string; type: "text"; placeholder: string; help: string }
  | { key: string; label: string; type: "edgeList"; placeholder: string; help: string };

export interface ConceptTopic<TState> {
  slug: string;
  title: string;
  summary: string;
  theory: ConceptTheory;
  inputFields: InputFieldSpec[];
  defaultInput: TopicInput;
  generateSteps: (input: TopicInput) => Step<TState>[];
  /** `generateSteps(defaultInput)`, computed once at module load — the
   * pre-fed example every topic starts on. */
  steps: Step<TState>[];
  quiz: QuizQuestion[];
}

/** Builds `steps` from `generateSteps(defaultInput)` so every topic
 * module only has to write the interesting parts. */
export function withDefaultSteps<TState>(
  topic: Omit<ConceptTopic<TState>, "steps">
): ConceptTopic<TState> {
  return { ...topic, steps: topic.generateSteps(topic.defaultInput) };
}

// ---------- Shared input parsing ----------
// Every generator gets raw strings from the input form; these turn
// them into the numbers/pairs the algorithms actually need. Malformed
// or empty entries are dropped rather than thrown — a student typing
// "3, , 7" or a trailing comma shouldn't crash the visualizer.

export function parseNumberList(raw: string | undefined): number[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

export function parseSingleNumber(raw: string | undefined, fallback = 0): number {
  const n = Number((raw ?? "").trim());
  return Number.isFinite(n) ? n : fallback;
}

/** "0-1, 1-2, 2-0" -> [[0,1],[1,2],[2,0]] — pairs reference node
 * *positions* in the accompanying node list, not arbitrary labels. */
export function parseEdgeList(raw: string | undefined): [number, number][] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const parts = pair.split(/[-–>]/).map((s) => Number(s.trim()));
      return parts.length === 2 ? (parts as [number, number]) : null;
    })
    .filter((p): p is [number, number] => !!p && p.every(Number.isFinite));
}
