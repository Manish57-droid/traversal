"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import TestReviewView, { type ReviewQuestion } from "@/components/TestReviewView";

export default function AptitudeTestReviewPage() {
  const params = useParams<{ testId: string }>();
  const [questions, setQuestions] = useState<ReviewQuestion[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/aptitude/tests/${params.testId}/review`)
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

  return <TestReviewView questions={questions ?? []} score={score} total={total} />;
}
