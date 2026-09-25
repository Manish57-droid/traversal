"use client";

// Shared full per-question right/wrong + explanation review — used by
// both Proctored Tests and Aptitude Test Mode's review pages, once the
// teacher has released results. Domain-specific gating/fetching stays
// in the caller; this only renders the already-fetched data.
export interface ReviewQuestion {
  id: string;
  prompt: string;
  /** MCQ only — empty for a theory question. */
  options: string[];
  /** MCQ only — null for a theory question. */
  correct_option: number | null;
  explanation: string | null;
  /** The selected option's index for an MCQ, the written text for a
   * theory question, or null if unanswered. */
  selected_option: number | string | null;
  /** Proctored-only — Aptitude questions never have one. */
  image_url?: string | null;
  /** Proctored-only — Aptitude has no theory questions. */
  question_type?: "mcq" | "theory";
  min_word_count?: number | null;
  max_marks?: number | null;
  marks_awarded?: number | null;
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
          if (q.question_type === "theory") {
            const answerText = typeof q.selected_option === "string" ? q.selected_option : "";
            const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
            const graded = q.marks_awarded !== null && q.marks_awarded !== undefined;
            return (
              <div key={q.id} className="card space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-fg">
                    <span className="mr-2 text-fg-subtle">{i + 1}.</span>
                    {q.prompt}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-fg">
                    {graded ? `${q.marks_awarded}/${q.max_marks} marks` : "Pending grading"}
                  </span>
                </div>
                {answerText ? (
                  <div className="space-y-1 rounded-lg border border-line/70 px-3 py-2 text-sm text-fg">
                    <p className="whitespace-pre-wrap">{answerText}</p>
                    <p className="text-xs text-fg-subtle">{wordCount} word{wordCount === 1 ? "" : "s"}</p>
                  </div>
                ) : (
                  <p className="text-xs text-fg-subtle">You didn't answer this question.</p>
                )}
                {q.explanation && <p className="text-xs text-fg-muted">{q.explanation}</p>}
              </div>
            );
          }

          const answered = q.selected_option !== null;
          const wasCorrect = answered && q.selected_option === q.correct_option;
          return (
            <div key={q.id} className="card space-y-3 p-4">
              {q.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.image_url} alt="" className="max-h-64 rounded-lg border border-line/70 object-contain" />
              )}
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
