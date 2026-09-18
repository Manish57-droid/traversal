"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QuestionPalette from "@/components/QuestionPalette";
import type { AptitudeAttemptQuestion } from "@/types";

interface TestSummary {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  time_limit_minutes: number;
  negative_marking_fraction: number;
  question_count: number;
}

interface MyAttempt {
  id: string;
  status: string;
  score: number | null;
  total_questions: number | null;
}

interface TestConfig {
  id: string;
  name: string;
  time_limit_minutes: number;
}

const RESYNC_INTERVAL_MS = 30_000;

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Combined pre-test check + take screen — unlike Proctored Tests,
// there's no fullscreen/camera permission gesture to arrange for, so
// there's no need for a separate /start route just to host that click.
export default function AptitudeTestPage() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [myAttempt, setMyAttempt] = useState<MyAttempt | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Take-phase state — populated once an in_progress attempt exists.
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [test, setTest] = useState<TestConfig | null>(null);
  const [questions, setQuestions] = useState<AptitudeAttemptQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const attemptIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);

  const goToResult = useCallback(
    (status: string, score: number | null, total: number | null) => {
      finishedRef.current = true;
      const q = new URLSearchParams({
        status,
        score: score === null ? "" : String(score),
        total: total === null ? "" : String(total),
      });
      router.replace(`/student/aptitude/test/${params.testId}/result?${q.toString()}`);
    },
    [params.testId, router]
  );

  function enterTakePhase(d: any) {
    setAttemptId(d.attempt.id);
    attemptIdRef.current = d.attempt.id;
    setTest(d.test);
    setQuestions(d.questions);
    setAnswers(d.attempt.answers ?? {});
    setRemaining(d.remaining_seconds);
  }

  useEffect(() => {
    fetch(`/api/aptitude/tests/${params.testId}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.test ?? null);
        setMyAttempt(d.my_attempt ?? null);
        if (d.my_attempt?.status === "in_progress") {
          return fetch(`/api/aptitude/tests/${params.testId}/attempts`)
            .then((r) => r.json())
            .then((data) => {
              if (data.attempt?.status !== "in_progress") {
                goToResult(data.attempt.status, data.attempt.score, data.attempt.total_questions);
                return;
              }
              enterTakePhase(data);
            });
        }
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.testId]);

  // Mark the currently-shown question as visited.
  useEffect(() => {
    const q = questions[currentIndex];
    if (!q) return;
    setVisited((prev) => (prev.has(q.id) ? prev : new Set(prev).add(q.id)));
  }, [currentIndex, questions]);

  const submitNow = useCallback(async () => {
    if (finishedRef.current || !attemptIdRef.current) return;
    finishedRef.current = true;
    setFinishing(true);
    try {
      const res = await fetch(`/api/aptitude/tests/${params.testId}/attempts/${attemptIdRef.current}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      goToResult(data.status, data.score, data.total_questions);
    } catch {
      finishedRef.current = false;
      setFinishing(false);
    }
  }, [params.testId, goToResult]);

  // Client-visible countdown — cosmetic only, seeded from the
  // server-given remaining_seconds and re-synced every 30s. The server
  // independently recomputes elapsed time on every write and force-
  // closes an overdue attempt regardless of what this timer shows.
  useEffect(() => {
    if (!test || finishedRef.current) return;
    const tick = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tick);
          submitNow();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [test, submitNow]);

  useEffect(() => {
    if (!test) return;
    const resync = setInterval(() => {
      if (finishedRef.current) return;
      fetch(`/api/aptitude/tests/${params.testId}/attempts`)
        .then((r) => r.json())
        .then((d) => {
          if (finishedRef.current) return;
          if (d.attempt && d.attempt.status !== "in_progress") {
            goToResult(d.attempt.status, d.attempt.score, d.attempt.total_questions);
            return;
          }
          if (typeof d.remaining_seconds === "number") setRemaining(d.remaining_seconds);
        })
        .catch(() => {});
    }, RESYNC_INTERVAL_MS);
    return () => clearInterval(resync);
  }, [test, params.testId, goToResult]);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      const res = await fetch(`/api/aptitude/tests/${params.testId}/attempts`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start the test.");
      enterTakePhase(data);
    } catch (err: any) {
      setStartError(err.message);
    } finally {
      setStarting(false);
    }
  }

  async function selectOption(questionId: string, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    if (!attemptId) return;
    try {
      const res = await fetch(`/api/aptitude/tests/${params.testId}/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, selected_option: optionIndex }),
      });
      if (res.status === 409) {
        const data = await res.json();
        goToResult(data.status, data.score, data.total_questions);
      }
    } catch {
      // Best-effort autosave.
    }
  }

  if (loading) return <p className="text-sm text-fg-muted">Loading…</p>;
  if (!summary) return <p className="card p-6 text-center text-sm text-fg-muted">Test not found.</p>;

  // Already completed.
  if (myAttempt && myAttempt.status !== "in_progress" && !test) {
    return (
      <div className="card mx-auto max-w-lg space-y-2 p-6 text-center">
        <p className="font-medium text-fg">You've already completed this test.</p>
        {myAttempt.score !== null && myAttempt.total_questions !== null && (
          <p className="font-display text-2xl text-fg">
            {myAttempt.score}/{myAttempt.total_questions}
          </p>
        )}
      </div>
    );
  }

  // Pre-test screen.
  if (!test) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="font-display text-2xl text-fg">{summary.name}</h1>
          {summary.description && <p className="mt-1 text-sm text-fg-muted">{summary.description}</p>}
        </div>

        <div className="card space-y-2 p-5 text-sm text-fg-muted">
          <p>{summary.question_count} question{summary.question_count === 1 ? "" : "s"}</p>
          <p>{summary.time_limit_minutes} minute time limit</p>
          {summary.negative_marking_fraction > 0 && <p>-{summary.negative_marking_fraction} per wrong answer</p>}
          <p className="text-fg-subtle">
            This is a plain timed test — no fullscreen lock, no camera, no activity monitoring.
          </p>
        </div>

        <button onClick={handleStart} disabled={starting} className="btn-primary w-full justify-center">
          {starting ? "Starting…" : "Start Test"}
        </button>
        {startError && <p className="text-sm text-red-400">{startError}</p>}
      </div>
    );
  }

  // Take-test screen.
  const current = questions[currentIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line/70 pb-3">
        <p className="font-display text-lg text-fg">{test.name}</p>
        <p className={`font-display text-xl tabular-nums ${remaining < 60 ? "text-red-400" : "text-fg"}`}>
          {formatClock(remaining)}
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="min-w-0 flex-1">
          {current && (
            <div className="card space-y-4 p-5">
              <p className="text-xs text-fg-subtle">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <p className="text-lg font-medium text-fg">{current.prompt}</p>
              <div className="space-y-2">
                {current.options.map((opt, i) => {
                  const selected = answers[current.id] === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectOption(current.id, i)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors ${
                        selected ? "border-success/60 bg-success/10 text-success" : "border-line/70 hover:border-line text-fg"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          selected ? "border-success bg-success" : "border-line"
                        }`}
                      >
                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-ink-fixed" />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="btn-secondary py-1.5 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentIndex === questions.length - 1}
                  onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                  className="btn-secondary py-1.5 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-4 sm:w-56">
          <QuestionPalette
            questions={questions}
            answers={answers}
            visited={visited}
            currentIndex={currentIndex}
            onJump={setCurrentIndex}
          />
          <button type="button" onClick={() => setShowSubmitConfirm(true)} className="btn-primary justify-center">
            Submit test
          </button>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur">
          <div className="card w-full max-w-sm space-y-4 p-6">
            <p className="font-medium text-fg">Are you sure?</p>
            <p className="text-sm text-fg-muted">You cannot change answers after submitting.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowSubmitConfirm(false)} className="btn-secondary py-1.5 text-xs">
                Cancel
              </button>
              <button onClick={submitNow} disabled={finishing} className="btn-primary py-1.5 text-xs">
                {finishing ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
