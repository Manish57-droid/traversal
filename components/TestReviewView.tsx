"use client";

// Shared full per-question right/wrong + explanation review — used by
// both Proctored Tests and Aptitude Test Mode's review pages, once the
// teacher has released results. Domain-specific gating/fetching stays
// in the caller; this only renders the already-fetched data.
export interface ReviewQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  selected_option: number | null;
}

export default function TestReviewView({
  title = "Test review",
  questions,
  score,
  total,
}: {
  title?: string;
  questions: ReviewQuestion[];
  score: number | null;
  total: number | null;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">{title}</h1>
        {score !== null && total !== null && (
          <p className="mt-1 text-sm text-fg-muted">
            You scored <span className="text-fg">{score}/{total}</span>
          </p>
        )}
      </div>

      <div className="space-y-3">
        {questions.map((q, i) => {
          const answered = q.selected_option !== null;
          const wasCorrect = answered && q.selected_option === q.correct_option;
          return (
            <div key={q.id} className="card space-y-3 p-4">
              <p className="font-medium text-fg">
                <span className="mr-2 text-fg-subtle">{i + 1}.</span>
                {q.prompt}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, idx) => {
                  let style = "border-line/70 text-fg-muted";
                  if (idx === q.correct_option) style = "border-success/60 bg-success/10 text-success";
                  else if (idx === q.selected_option) style = "border-red-500/50 bg-red-500/10 text-red-400";
                  return (
                    <div key={idx} className={`rounded-lg border px-3 py-2 text-sm ${style}`}>
                      {opt}
                      {idx === q.correct_option && " ✓"}
                      {idx === q.selected_option && idx !== q.correct_option && " (your answer)"}
                    </div>
                  );
                })}
                {!answered && <p className="text-xs text-fg-subtle">You didn't answer this question.</p>}
              </div>
              {q.explanation && (
                <p className={`text-xs ${wasCorrect ? "text-fg-subtle" : "text-fg-muted"}`}>{q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
