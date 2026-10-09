"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, PencilLine } from "lucide-react";
import type { AptitudeCategory, AptitudeQuestion } from "@/types";
import GuideArticle from "@/components/interview-prep/GuideArticle";

interface HistoryRow {
  question_id: string;
  attempts_count: number;
  last_correct: boolean | null;
  last_attempted_at: string | null;
}

type PracticeQuestion = Pick<AptitudeQuestion, "id" | "category" | "topic" | "prompt" | "options" | "difficulty">;

interface Feedback {
  correct: boolean;
  correct_option: number;
  explanation: string | null;
}

/** Picks the next question to show, favoring ones the student hasn't
 * attempted yet or got wrong last time over ones they've already
 * mastered — with randomness within each priority tier so practice
 * doesn't feel like a fixed quiz. Avoids immediately repeating
 * `excludeId` when another candidate is available. */
function pickNextQuestion(
  questions: PracticeQuestion[],
  history: Record<string, HistoryRow>,
  excludeId?: string
): PracticeQuestion | null {
  if (questions.length === 0) return null;

  const tiers: PracticeQuestion[][] = [[], [], []]; // unattempted, last-wrong, last-correct
  for (const q of questions) {
    const h = history[q.id];
    if (!h || h.last_correct === null) tiers[0].push(q);
    else if (h.last_correct === false) tiers[1].push(q);
    else tiers[2].push(q);
  }

  for (const tier of tiers) {
    const candidates = tier.filter((q) => q.id !== excludeId);
    const pool = candidates.length > 0 ? candidates : tier;
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)];
  }
  return null;
}

type Tab = "theory" | "practice";

// One aptitude topic: its theory (concepts, formulas, shortcuts from
// lib/aptitude-theory) on the first tab, then adaptive practice on the
// second. Opens on Theory so students read the tricks before
// attempting questions; a topic without a theory section goes
// straight to Practice with no tabs.
export default function AptitudeTopicPractice({
  category,
  topic,
  theory,
}: {
  category: AptitudeCategory;
  topic: string;
  theory: { body: string; readMinutes: number } | null;
}) {
  const [tab, setTab] = useState<Tab>(theory ? "theory" : "practice");

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [history, setHistory] = useState<Record<string, HistoryRow>>({});
  const [current, setCurrent] = useState<PracticeQuestion | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/aptitude/practice?category=${category}&topic=${encodeURIComponent(topic)}`)
      .then((r) => r.json())
      .then((d: { questions: PracticeQuestion[]; history: HistoryRow[] }) => {
        const qs = d.questions ?? [];
        const hist: Record<string, HistoryRow> = {};
        for (const h of d.history ?? []) hist[h.question_id] = h;
        setQuestions(qs);
        setHistory(hist);
        setCurrent(pickNextQuestion(qs, hist));
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, topic]);

  const progress = useMemo(() => {
    const attempted = questions.filter((q) => history[q.id]).length;
    const mastered = questions.filter((q) => history[q.id]?.last_correct).length;
    return { attempted, mastered, total: questions.length };
  }, [questions, history]);

  async function handleSubmitAnswer() {
    if (!current || selected === null) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/aptitude/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: current.id, selected_option: selected }),
      });
      const data: Feedback = await res.json();
      if (!res.ok) throw new Error((data as any).error);

      setFeedback(data);
      setHistory((prev) => ({
        ...prev,
        [current.id]: {
          question_id: current.id,
          attempts_count: (prev[current.id]?.attempts_count ?? 0) + 1,
          last_correct: data.correct,
          last_attempted_at: new Date().toISOString(),
        },
      }));
      setSessionCount((n) => n + 1);
      if (data.correct) setSessionCorrect((n) => n + 1);
    } finally {
      setSubmitting(false);
    }
  }

  const handleNext = useCallback(() => {
    setSelected(null);
    setFeedback(null);
    setCurrent((prevCurrent) => pickNextQuestion(questions, history, prevCurrent?.id));
  }, [questions, history]);

  function startPractice() {
    setTab("practice");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/student/aptitude/practice/${category}`} className="text-xs text-fg-muted hover:text-fg">
            ← Topics
          </Link>
          <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">{topic}</h1>
        </div>
        {!loading && (
          <div className="text-right text-xs text-fg-muted">
            <p>
              {progress.mastered}/{progress.total} mastered
            </p>
            <p>This session: {sessionCorrect}/{sessionCount} correct</p>
          </div>
        )}
      </div>

      {theory && (
        <div className="flex gap-1 border-b border-line/60" role="tablist">
          {(
            [
              { id: "theory", label: "1. Theory & shortcuts", icon: BookOpen },
              { id: "practice", label: "2. Practice", icon: PencilLine },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors ${
                tab === id ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === "theory" && theory ? (
        <div className="space-y-6">
          <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <Clock className="h-3.5 w-3.5" />
            {theory.readMinutes} min read · learn the concepts and shortcuts, then try the questions
          </p>
          <div className="card p-5 sm:p-8">
            <GuideArticle content={theory.body} />
          </div>
          <div className="card flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-medium text-fg">Done with the theory?</p>
              <p className="text-sm text-fg-muted">Put the shortcuts to work on this topic's questions.</p>
            </div>
            <button className="btn-primary" onClick={startPractice}>
              Start practicing →
            </button>
          </div>
        </div>
      ) : loading ? (
        <p className="text-sm text-fg-muted">Loading…</p>
      ) : !current ? (
        <p className="card p-6 text-center text-sm text-fg-muted">
          No questions in this topic yet.
        </p>
      ) : (
        <div className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            {current.difficulty !== "unknown" && (
              <span className="text-xs capitalize text-fg-muted">{current.difficulty}</span>
            )}
          </div>
          <p className="text-lg font-medium text-fg">{current.prompt}</p>

          <div className="space-y-2">
            {current.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrectOption = feedback && i === feedback.correct_option;
              const isWrongSelection = feedback && isSelected && !feedback.correct;

              let style = "border-line/70 hover:border-line";
              if (feedback) {
                if (isCorrectOption) style = "border-success/60 bg-success/10 text-success";
                else if (isWrongSelection) style = "border-red-500/50 bg-red-500/10 text-red-400";
                else style = "border-line/70 opacity-60";
              } else if (isSelected) {
                style = "border-success/60 bg-success/10 text-success";
              }

              return (
                <button
                  key={i}
                  disabled={!!feedback}
                  onClick={() => setSelected(i)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${style} disabled:cursor-default`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {feedback && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                feedback.correct ? "border-success/40 bg-success/5 text-success" : "border-red-500/40 bg-red-500/5 text-red-400"
              }`}
            >
              <p className="font-medium">{feedback.correct ? "Correct!" : "Not quite."}</p>
              {feedback.explanation && <p className="mt-1 text-fg">{feedback.explanation}</p>}
            </div>
          )}

          <div className="flex justify-end">
            {!feedback ? (
              <button className="btn-primary" disabled={selected === null || submitting} onClick={handleSubmitAnswer}>
                {submitting ? "Checking..." : "Submit answer"}
              </button>
            ) : (
              <button className="btn-primary" onClick={handleNext}>
                Next question
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
