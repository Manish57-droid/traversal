"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import QuestionPalette from "@/components/QuestionPalette";
import type { ProctoredAttemptQuestion, ProctoredViolationType } from "@/types";

interface TestConfig {
  id: string;
  name: string;
  class_name: string;
  time_limit_minutes: number;
  max_violations_before_autosubmit: number;
  require_camera: boolean;
  require_mic: boolean;
}

const RESYNC_INTERVAL_MS = 30_000;
const VIOLATION_DEBOUNCE_MS = 1500;

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ProctoredTestTakePage() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [test, setTest] = useState<TestConfig | null>(null);
  const [studentName, setStudentName] = useState("");
  const [questions, setQuestions] = useState<ProctoredAttemptQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // Refs mirror state that violation/timer callbacks need without
  // being retriggered by every render (closures registered once).
  const attemptIdRef = useRef<string | null>(null);
  const testRef = useRef<TestConfig | null>(null);
  const finishedRef = useRef(false);
  const lastViolationAtRef = useRef(0);
  const fullscreenExitLoggedRef = useRef(false);

  function showToast(text: string) {
    setToast({ text, key: Date.now() });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const goToResult = useCallback(
    (status: string, score: number | null, total: number | null) => {
      finishedRef.current = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      const q = new URLSearchParams({
        status,
        score: score === null ? "" : String(score),
        total: total === null ? "" : String(total),
      });
      router.replace(`/student/proctored-tests/${params.testId}/result?${q.toString()}`);
    },
    [params.testId, router]
  );

  const applyLoadResponse = useCallback(
    (d: any) => {
      if (d.attempt.status !== "in_progress") {
        goToResult(d.attempt.status, d.attempt.score, d.attempt.total_questions);
        return;
      }
      setAttemptId(d.attempt.id);
      attemptIdRef.current = d.attempt.id;
      setTest(d.test);
      testRef.current = d.test;
      setStudentName(d.student_name);
      setQuestions(d.questions);
      setAnswers(d.attempt.answers ?? {});
      setViolationCount(d.attempt.violation_count ?? 0);
      setRemaining(d.remaining_seconds);
    },
    [goToResult]
  );

  // Initial load.
  useEffect(() => {
    fetch(`/api/proctored-tests/${params.testId}/attempts`)
      .then(async (r) => {
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        applyLoadResponse(await r.json());
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.testId]);

  useEffect(() => {
    if (notFound) router.replace(`/student/proctored-tests/${params.testId}/start`);
  }, [notFound, params.testId, router]);

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
      const res = await fetch(`/api/proctored-tests/${params.testId}/attempts/${attemptIdRef.current}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      goToResult(data.status, data.score, data.total_questions);
    } catch {
      finishedRef.current = false;
      setFinishing(false);
    }
  }, [params.testId, goToResult]);

  // Client-visible countdown — purely cosmetic, ticks down from the
  // server-given remaining_seconds. The server (not this timer)
  // decides when time is actually up: every write endpoint re-checks
  // elapsed time against started_at and force-closes the attempt if
  // it's overdue, so even a paused/suspended tab gets caught on its
  // next request. This client tick only decides when to *proactively*
  // call submit so the student doesn't have to make another move first.
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

  // Periodic resync with the server clock, in case of drift or a
  // suspended tab — replaces the local countdown's baseline outright.
  useEffect(() => {
    if (!test) return;
    const resync = setInterval(() => {
      if (finishedRef.current) return;
      fetch(`/api/proctored-tests/${params.testId}/attempts`)
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

  const logViolation = useCallback(
    async (type: ProctoredViolationType) => {
      if (finishedRef.current || !attemptIdRef.current) return;
      try {
        const res = await fetch(
          `/api/proctored-tests/${params.testId}/attempts/${attemptIdRef.current}/violations`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ violation_type: type }),
          }
        );
        const data = await res.json();
        setViolationCount(data.violation_count);
        if (data.autoSubmitted) {
          finishedRef.current = true;
          const result = data.result ?? { status: "auto_submitted_violation", score: null, total_questions: null };
          goToResult(result.status, result.score, result.total_questions);
          return;
        }
        const max = testRef.current?.max_violations_before_autosubmit ?? 0;
        showToast(`Violation logged (${data.violation_count}/${max}). Reaching the limit will auto-submit your test.`);
      } catch {
        // Best-effort — if the network call itself fails, the server
        // still enforces everything on the next successful request.
      }
    },
    [params.testId, goToResult]
  );

  // Fullscreen exit detection.
  useEffect(() => {
    function onFullscreenChange() {
      if (finishedRef.current) return;
      if (!document.fullscreenElement) {
        setShowResumeOverlay(true);
        if (!fullscreenExitLoggedRef.current) {
          fullscreenExitLoggedRef.current = true;
          logViolation("fullscreen_exit");
        }
      } else {
        setShowResumeOverlay(false);
        fullscreenExitLoggedRef.current = false;
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [logViolation]);

  // Tab switch / window blur detection, debounced.
  useEffect(() => {
    function maybeLog() {
      if (finishedRef.current) return;
      const now = Date.now();
      if (now - lastViolationAtRef.current < VIOLATION_DEBOUNCE_MS) return;
      lastViolationAtRef.current = now;
      logViolation("tab_switch");
    }
    function onVisibilityChange() {
      if (document.hidden) maybeLog();
    }
    function onBlur() {
      maybeLog();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [logViolation]);

  // Copy/cut/contextmenu/selectstart prevention over the question area.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    function blockAndLog(e: Event) {
      e.preventDefault();
      logViolation("copy_attempt");
    }
    function blockOnly(e: Event) {
      e.preventDefault();
    }
    el.addEventListener("copy", blockAndLog);
    el.addEventListener("cut", blockAndLog);
    el.addEventListener("contextmenu", blockOnly);
    el.addEventListener("selectstart", blockOnly);
    return () => {
      el.removeEventListener("copy", blockAndLog);
      el.removeEventListener("cut", blockAndLog);
      el.removeEventListener("contextmenu", blockOnly);
      el.removeEventListener("selectstart", blockOnly);
    };
  }, [logViolation, questions.length]);

  // Camera-off detection (only when this test requires a camera).
  useEffect(() => {
    if (!test?.require_camera && !test?.require_mic) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: !!test?.require_camera, audio: !!test?.require_mic })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        s.getVideoTracks().forEach((track) => {
          track.addEventListener("ended", () => logViolation("camera_off"));
          track.addEventListener("mute", () => logViolation("camera_off"));
        });
      })
      .catch(() => logViolation("camera_off"));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [test?.require_camera, test?.require_mic, logViolation]);

  async function selectOption(questionId: string, optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    if (!attemptId) return;
    try {
      const res = await fetch(`/api/proctored-tests/${params.testId}/attempts/${attemptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, selected_option: optionIndex }),
      });
      if (res.status === 409) {
        const data = await res.json();
        goToResult(data.status, data.score, data.total_questions);
      }
    } catch {
      // Best-effort autosave — the next successful selection (or the
      // final submit) will still carry the latest client-known answer.
    }
  }

  async function resumeFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // If the browser refuses, the overlay just stays up — the
      // student can retry; nothing server-side depends on this call
      // succeeding, only on the violation already logged.
    }
  }

  if (loading) return <p className="text-sm text-fg-muted">Loading…</p>;
  if (notFound || !test) return <p className="text-sm text-fg-muted">Redirecting…</p>;

  const current = questions[currentIndex];
  const max = test.max_violations_before_autosubmit;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      <div className="flex items-center justify-between border-b border-line/70 bg-surface/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{studentName}</p>
          <p className="truncate text-xs text-fg-muted">{test.class_name}</p>
        </div>
        <div className="text-right">
          <p className={`font-display text-xl tabular-nums ${remaining < 60 ? "text-red-400" : "text-fg"}`}>
            {formatClock(remaining)}
          </p>
          <p className="text-xs text-fg-subtle">
            {violationCount}/{max} violations
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:flex-row sm:gap-6 sm:p-6">
        <div ref={contentRef} className="min-w-0 flex-1 select-none">
          {current && (
            <div className="card space-y-4 p-5">
              <p className="text-xs text-fg-subtle">
                Question {currentIndex + 1} of {questions.length}
              </p>
              {current.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.image_url}
                  alt=""
                  className="max-h-72 rounded-lg border border-line/70 object-contain"
                />
              )}
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

          <button
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            className="btn-primary justify-center"
          >
            Submit test
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-warn/40 bg-warn/10 px-4 py-2 text-sm text-warn shadow-lg">
          {toast.text}
        </div>
      )}

      {showResumeOverlay && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg/95 p-6 text-center backdrop-blur">
          <p className="text-lg font-medium text-fg">You exited fullscreen</p>
          <p className="max-w-sm text-sm text-fg-muted">
            This has been logged as a violation. Click Resume to continue your test in fullscreen.
          </p>
          <button onClick={resumeFullscreen} className="btn-primary">
            Resume
          </button>
        </div>
      )}

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
