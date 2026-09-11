"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ReviewQuestion {
  id: string;
  prompt: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  selected_option: number | null;
}

export default function ProctoredTestReviewPage() {
  const params = useParams<{ testId: string }>();
  const [questions, setQuestions] = useState<ReviewQuestion[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proctored-tests/${params.testId}/review`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "Results haven't been released yet.");
          return;
        }
        setQuestions(data.questions);
        setScore(data.score);
        setTotal(data.total_questions);
      })
      .finally(() => setLoading(false));
  }, [params.testId]);

  if (loading) return <p className="text-sm text-fg-muted">Loading…</p>;

  if (error) {
    return <p className="card p-6 text-center text-sm text-fg-muted">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Test review</h1>
        {score !== null && total !== null && (
          <p className="mt-1 text-sm text-fg-muted">
            You scored <span className="text-fg">{score}/{total}</span>
          </p>
        )}
      </div>

      <div className="space-y-3">
        {questions?.map((q, i) => {
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
