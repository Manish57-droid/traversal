"use client";

// The proctored take-screen's 6-state, section-grouped question
// palette — a deliberate fork of the shared components/QuestionPalette
// (which stays untouched for Aptitude Test Mode, whose 3-state model
// means something different: there, red = "not visited". Here red
// means "visited, not answered" and gray means "not visited" — a real
// semantic remap, not just an extra color, so reusing one component
// for both would have silently changed Aptitude's meaning too).
//
// Colors are adapted from the reference image's blue/green/red/purple
// onto this app's existing token system rather than hardcoded: blue
// (current) -> accent, green (answered) -> success, red (not answered)
// -> warn (already a red/orange-red in this palette), gray (not
// visited) -> the neutral surface/line tokens, purple (marked for
// review) -> the new --review token, navy (answered & marked) -> the
// new --review-2 token (see app/globals.css).
import type { ProctoredAttemptQuestion, ProctoredQuestionStatus } from "@/types";

interface SectionInfo {
  id: string;
  name: string;
}

type PaletteState = "current" | "answered" | "not-answered" | "not-visited" | "marked" | "answered-marked";

const STATE_STYLE: Record<PaletteState, string> = {
  current: "border-accent bg-accent/15 text-accent ring-2 ring-accent",
  answered: "border-success/60 bg-success/15 text-success",
  "not-answered": "border-warn/60 bg-warn/15 text-warn",
  "not-visited": "border-line bg-surface-2 text-fg-subtle",
  marked: "border-review/60 bg-review/15 text-review",
  "answered-marked": "border-review-2/60 bg-review-2/20 text-review-2",
};

const LEGEND: { state: PaletteState; label: string }[] = [
  { state: "answered", label: "Answered" },
  { state: "not-answered", label: "Not Answered" },
  { state: "not-visited", label: "Not Visited" },
  { state: "marked", label: "Marked for Review" },
  { state: "answered-marked", label: "Answered & Marked for Review" },
];

export function questionPaletteState(
  questionId: string,
  answers: Record<string, number>,
  questionStatus: Record<string, ProctoredQuestionStatus>,
  isCurrent: boolean
): PaletteState {
  if (isCurrent) return "current";
  const status = questionStatus[questionId] ?? { visited: false, marked_for_review: false };
  const answered = answers[questionId] !== undefined;
  if (status.marked_for_review && answered) return "answered-marked";
  if (status.marked_for_review) return "marked";
  if (!status.visited) return "not-visited";
  if (answered) return "answered";
  return "not-answered";
}

export default function SectionQuestionPalette({
  sections,
  questions,
  answers,
  questionStatus,
  currentQuestionId,
  onJump,
}: {
  sections: SectionInfo[];
  questions: ProctoredAttemptQuestion[];
  answers: Record<string, number>;
  questionStatus: Record<string, ProctoredQuestionStatus>;
  currentQuestionId: string | undefined;
  onJump: (questionId: string) => void;
}) {
  return (
    <div className="card space-y-4 p-4">
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-fg-subtle">Legend</p>
        <div className="grid grid-cols-1 gap-1.5">
          {LEGEND.map(({ state, label }) => (
            <div key={state} className="flex items-center gap-2 text-xs text-fg-muted">
              <span className={`h-4 w-4 shrink-0 rounded-full border ${STATE_STYLE[state]}`} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {sections.map((section) => {
        const sectionQuestions = questions.filter((q) => q.section_id === section.id);
        if (sectionQuestions.length === 0) return null;
        return (
          <div key={section.id}>
            <p className="mb-2 truncate text-xs font-medium text-fg" title={section.name}>
              {section.name}
            </p>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-4">
              {sectionQuestions.map((q) => {
                const globalIndex = questions.findIndex((x) => x.id === q.id);
                const state = questionPaletteState(q.id, answers, questionStatus, q.id === currentQuestionId);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onJump(q.id)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${STATE_STYLE[state]}`}
                  >
                    {globalIndex + 1}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
