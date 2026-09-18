"use client";

// Shared numbered question grid for a test-taking screen — green
// (answered), yellow (visited, not answered), red (not visited yet).
// Used by both Proctored Tests and Aptitude Test Mode's take screens;
// domain-specific behavior (violations, fullscreen, etc.) stays in the
// caller, this component only knows about answered/visited/current.
export default function QuestionPalette({
  questions,
  answers,
  visited,
  currentIndex,
  onJump,
}: {
  questions: { id: string }[];
  answers: Record<string, number>;
  visited: Set<string>;
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="card p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-fg-subtle">Questions</p>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-4">
        {questions.map((q, i) => {
          const answered = answers[q.id] !== undefined;
          const seen = visited.has(q.id);
          const style = answered
            ? "border-success/60 bg-success/10 text-success"
            : seen
              ? "border-warn/50 bg-warn/10 text-warn"
              : "border-red-500/40 bg-red-500/5 text-red-400";
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(i)}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${style} ${
                currentIndex === i ? "ring-2 ring-accent" : ""
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
