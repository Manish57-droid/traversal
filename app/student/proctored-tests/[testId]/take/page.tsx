"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import SectionQuestionPalette from "@/components/proctored-take/SectionQuestionPalette";
import BasicCalculator from "@/components/proctored-take/BasicCalculator";
import { useCameraProctoring } from "@/components/proctored-take/useCameraProctoring";
import { remainingSeconds as computeRemaining } from "@/lib/testTiming";
import type {
  ProctoredAttemptQuestion,
  ProctoredQuestionStatus,
  ProctoredSectionAttempt,
  ProctoredTestSection,
  ProctoredTimerMode,
  ProctoredViolationType,
} from "@/types";

interface TestConfig {
  id: string;
  name: string;
  class_name: string;
  time_limit_minutes: number;
  max_violations_before_autosubmit: number;
  require_camera: boolean;
  require_mic: boolean;
  timer_mode: ProctoredTimerMode;
  allow_free_section_navigation: boolean;
}

const RESYNC_INTERVAL_MS = 30_000;
const VIOLATION_DEBOUNCE_MS = 1500;

function formatClock(totalSeconds: number) {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function ProctoredTestTakePage() {
  const params = useParams<{ testId: string }>();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [test, setTest] = useState<TestConfig | null>(null);
  const [studentName, setStudentName] = useState("");
  const [questions, setQuestions] = useState<ProctoredAttemptQuestion[]>([]);
  const [sections, setSections] = useState<ProctoredTestSection[]>([]);
  const [sectionAttempts, setSectionAttempts] = useState<ProctoredSectionAttempt[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [questionStatus, setQuestionStatus] = useState<Record<string, ProctoredQuestionStatus>>({});
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  /** The selected MCQ option index, or the in-progress theory answer
   * text — provisional until Save & Next / Mark for Review persists it,
   * same NEET-style "not saved until you act" flow either way. */
  const [draftAnswer, setDraftAnswer] = useState<number | string | null>(null);
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
  const sectionsRef = useRef<ProctoredTestSection[]>([]);
  const sectionAttemptsRef = useRef<ProctoredSectionAttempt[]>([]);
  const currentSectionIdRef = useRef<string | null>(null);
  const finishedRef = useRef(false);
  const lastViolationAtRef = useRef(0);
  const fullscreenExitLoggedRef = useRef(false);
  const advancingSectionRef = useRef(false);

  function showToast(text: string) {
    setToast({ text, key: Date.now() });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const goToResult = useCallback(
    (status: string, score: number | null, total: number | null, gradingStatus?: string) => {
      finishedRef.current = true;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      const q = new URLSearchParams({
        status,
        score: score === null ? "" : String(score),
        total: total === null ? "" : String(total),
        ...(gradingStatus ? { grading: gradingStatus } : {}),
      });
      router.replace(`/student/proctored-tests/${params.testId}/result?${q.toString()}`);
    },
    [params.testId, router]
  );

  const sortedSections = useMemo(() => [...sections].sort((a, b) => a.position - b.position), [sections]);

  function sectionAttemptFor(sectionId: string): ProctoredSectionAttempt | undefined {
    return sectionAttempts.find((sa) => sa.section_id === sectionId);
  }

  function questionsInSection(sectionId: string) {
    return questions.filter((q) => q.section_id === sectionId);
  }

  // Picks where to resume: the first section that isn't complete, and
  // within it, the first not-visited question (or its first question
  // if every question there has already been visited).
  const pickResumePoint = useCallback(
    (secs: ProctoredTestSection[], secAttempts: ProctoredSectionAttempt[], qs: ProctoredAttemptQuestion[], qStatus: Record<string, ProctoredQuestionStatus>) => {
      const ordered = [...secs].sort((a, b) => a.position - b.position);
      const target = ordered.find((s) => secAttempts.find((sa) => sa.section_id === s.id)?.status !== "completed") ?? ordered[0];
      if (!target) return { sectionId: null, questionId: null };
      const sectionQs = qs.filter((q) => q.section_id === target.id);
      const firstUnvisited = sectionQs.find((q) => !qStatus[q.id]?.visited);
      return { sectionId: target.id, questionId: (firstUnvisited ?? sectionQs[0])?.id ?? null };
    },
    []
  );

  const applyLoadResponse = useCallback(
    (d: any) => {
      if (d.attempt.status !== "in_progress") {
        goToResult(d.attempt.status, d.attempt.score, d.attempt.max_score ?? d.attempt.total_questions, d.attempt.grading_status);
        return;
      }
      setAttemptId(d.attempt.id);
      attemptIdRef.current = d.attempt.id;
      setTest(d.test);
      testRef.current = d.test;
      setStudentName(d.student_name);
      setQuestions(d.questions);
      setSections(d.sections ?? []);
      sectionsRef.current = d.sections ?? [];
      setSectionAttempts(d.section_attempts ?? []);
      sectionAttemptsRef.current = d.section_attempts ?? [];
      setAnswers(d.attempt.answers ?? {});
      setQuestionStatus(d.attempt.question_status ?? {});
      setViolationCount(d.attempt.violation_count ?? 0);

      const { sectionId, questionId } = pickResumePoint(d.sections ?? [], d.section_attempts ?? [], d.questions, d.attempt.question_status ?? {});
      setCurrentSectionId(sectionId);
      currentSectionIdRef.current = sectionId;
      setCurrentQuestionId(questionId);

      if (d.test.timer_mode === "per_section") {
        const section = (d.sections ?? []).find((s: ProctoredTestSection) => s.id === sectionId);
        const sa = (d.section_attempts ?? []).find((x: ProctoredSectionAttempt) => x.section_id === sectionId);
        const limit = section?.time_limit_minutes ?? d.test.time_limit_minutes;
        setRemaining(sa?.started_at ? computeRemaining(sa.started_at, limit) : limit * 60);
      } else {
        setRemaining(d.remaining_seconds);
      }
    },
    [goToResult, pickResumePoint]
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

  // Enter the resumed/initial section server-side (idempotent — sets
  // started_at only the first time) once we know which one it is.
  useEffect(() => {
    if (!attemptId || !currentSectionId) return;
    fetch(`/api/proctored-tests/${params.testId}/attempts/${attemptId}/sections/${currentSectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "enter" }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.section_attempt) return;
        setSectionAttempts((prev) => {
          const next = prev.filter((sa) => sa.section_id !== d.section_attempt.section_id).concat(d.section_attempt);
          sectionAttemptsRef.current = next;
          return next;
        });
        if (testRef.current?.timer_mode === "per_section") {
          const section = sectionsRef.current.find((s) => s.id === currentSectionId);
          const limit = section?.time_limit_minutes ?? testRef.current.time_limit_minutes;
          setRemaining(computeRemaining(d.section_attempt.started_at, limit));
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, currentSectionId]);

  // Reset the draft option + mark visited whenever the displayed
  // question changes. Selecting an option is LOCAL/provisional until
  // one of the three buttons persists it — matches the reference
  // NEET-style flow, where a selection isn't "saved" until Save & Next
  // (or Mark for Review & Next) is pressed.
  useEffect(() => {
    if (!currentQuestionId) return;
    setDraftAnswer(answers[currentQuestionId] ?? null);

    if (!questionStatus[currentQuestionId]?.visited && attemptIdRef.current) {
      setQuestionStatus((prev) => ({ ...prev, [currentQuestionId]: { visited: true, marked_for_review: prev[currentQuestionId]?.marked_for_review ?? false } }));
      fetch(`/api/proctored-tests/${params.testId}/attempts/${attemptIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: currentQuestionId, visited: true }),
      }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionId]);

  const submitNow = useCallback(async () => {
    if (finishedRef.current || !attemptIdRef.current) return;
    finishedRef.current = true;
    setFinishing(true);
    try {
      const res = await fetch(`/api/proctored-tests/${params.testId}/attempts/${attemptIdRef.current}/submit`, {
        method: "POST",
      });
      const data = await res.json();
      goToResult(data.status, data.score, data.max_score ?? data.total_questions, data.grading_status);
    } catch {
      finishedRef.current = false;
      setFinishing(false);
    }
  }, [params.testId, goToResult]);

  // Moves to the next section that isn't complete, or finishes the
  // whole attempt if none remain — shared by "Submit Section &
  // Continue" and a section timer expiring.
  const advanceToNextSection = useCallback(
    async (fromSectionId: string) => {
      if (advancingSectionRef.current) return;
      advancingSectionRef.current = true;
      try {
        const ordered = [...sectionsRef.current].sort((a, b) => a.position - b.position);
        const fromPos = ordered.find((s) => s.id === fromSectionId)?.position ?? -1;
        const next = ordered.find(
          (s) => s.position > fromPos && sectionAttemptsRef.current.find((sa) => sa.section_id === s.id)?.status !== "completed"
        );
        if (!next) {
          await submitNow();
          return;
        }
        const sectionQs = questions.filter((q) => q.section_id === next.id);
        setCurrentSectionId(next.id);
        currentSectionIdRef.current = next.id;
        setCurrentQuestionId(sectionQs[0]?.id ?? null);
        showToast(`Moved to the next section: ${next.name}`);
      } finally {
        advancingSectionRef.current = false;
      }
    },
    [questions, submitNow]
  );

  const submitSection = useCallback(
    async (sectionId: string) => {
      if (!attemptIdRef.current) return null;
      try {
        const res = await fetch(`/api/proctored-tests/${params.testId}/attempts/${attemptIdRef.current}/sections/${sectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "submit" }),
        });
        const data = await res.json();
        if (data.section_attempt) {
          setSectionAttempts((prev) => {
            const next = prev.filter((sa) => sa.section_id !== sectionId).concat(data.section_attempt);
            sectionAttemptsRef.current = next;
            return next;
          });
        }
        return data.section_attempt ?? null;
      } catch {
        return null;
      }
    },
    [params.testId]
  );

  async function handleSubmitSectionAndContinue() {
    if (!currentSectionId) return;
    await submitSection(currentSectionId);
    await advanceToNextSection(currentSectionId);
  }

  // Client-visible countdown — purely cosmetic, ticks down from the
  // server-given remaining_seconds (combined mode: whole attempt;
  // per-section mode: the current section only). The server always
  // re-derives the real deadline from started_at on every write, so
  // even a paused/suspended tab gets caught on its next request; this
  // client tick only decides when to *proactively* act so the student
  // doesn't have to make another move first.
  useEffect(() => {
    if (!test || finishedRef.current) return;
    const tick = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(tick);
          if (test.timer_mode === "per_section" && currentSectionIdRef.current) {
            const sectionId = currentSectionIdRef.current;
            submitSection(sectionId).then(() => advanceToNextSection(sectionId));
          } else {
            submitNow();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [test, submitNow, submitSection, advanceToNextSection, currentSectionId]);

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
            goToResult(d.attempt.status, d.attempt.score, d.attempt.max_score ?? d.attempt.total_questions, d.attempt.grading_status);
            return;
          }
          setSectionAttempts(d.section_attempts ?? []);
          sectionAttemptsRef.current = d.section_attempts ?? [];
          if (test.timer_mode === "per_section" && currentSectionIdRef.current) {
            const section = sectionsRef.current.find((s) => s.id === currentSectionIdRef.current);
            const sa = (d.section_attempts ?? []).find((x: ProctoredSectionAttempt) => x.section_id === currentSectionIdRef.current);
            if (sa?.status === "completed") {
              // Completed elsewhere (e.g. another tab) — move on.
              advanceToNextSection(currentSectionIdRef.current);
              return;
            }
            const limit = section?.time_limit_minutes ?? d.test.time_limit_minutes;
            if (sa?.started_at) setRemaining(computeRemaining(sa.started_at, limit));
          } else if (typeof d.remaining_seconds === "number") {
            setRemaining(d.remaining_seconds);
          }
        })
        .catch(() => {});
    }, RESYNC_INTERVAL_MS);
    return () => clearInterval(resync);
  }, [test, params.testId, goToResult, advanceToNextSection]);

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
          goToResult(result.status, result.score, result.max_score ?? result.total_questions, result.grading_status);
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

  // Camera-off detection (only when this test requires a camera). Also
  // attaches the video track to a hidden <video> element so the
  // camera-vision proctoring hook below has frames to analyze — this
  // stream was previously grabbed only to watch for it stopping/muting,
  // never actually read.
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
        if (cameraVideoRef.current && test?.require_camera) {
          cameraVideoRef.current.srcObject = s;
          cameraVideoRef.current.play().catch(() => {});
        }
      })
      .catch(() => logViolation("camera_off"));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [test?.require_camera, test?.require_mic, logViolation]);

  // Camera-vision checks (phone visible, a second face, sustained
  // mouth movement read as talking, head turned away) — see
  // components/proctored-take/useCameraProctoring.ts for the
  // heuristics and their honestly-disclosed limits. Only three of the
  // four count as violations; looking away is a toast nudge only.
  useCameraProctoring(cameraVideoRef, !!test?.require_camera, {
    onPhoneDetected: () => logViolation("phone_detected"),
    onMultiplePeople: () => logViolation("multiple_people"),
    onTalkingDetected: () => logViolation("talking_detected"),
    onLookingAway: () => showToast("Please face the screen and keep your head steady."),
  });

  async function persistAnswer(questionId: string, selectedOption: number | string | null, markedForReview?: boolean) {
    if (!attemptIdRef.current) return;
    try {
      const res = await fetch(`/api/proctored-tests/${params.testId}/attempts/${attemptIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: questionId,
          selected_option: selectedOption,
          visited: true,
          ...(markedForReview !== undefined ? { marked_for_review: markedForReview } : {}),
        }),
      });
      if (res.status === 409) {
        const data = await res.json();
        goToResult(data.status, data.score, data.max_score ?? data.total_questions, data.grading_status);
      }
    } catch {
      // Best-effort — the next successful action (or the final submit)
      // still carries the latest client-known state.
    }
  }

  function goToNextQuestionInSection() {
    if (!currentSectionId || !currentQuestionId) return;
    const sectionQs = questionsInSection(currentSectionId);
    const idx = sectionQs.findIndex((q) => q.id === currentQuestionId);
    if (idx >= 0 && idx < sectionQs.length - 1) setCurrentQuestionId(sectionQs[idx + 1].id);
  }

  // A theory draft is a string — only worth saving once it has actual
  // content; an MCQ draft is an option index, valid at 0. Blank/whitespace-
  // only text is treated the same as "nothing selected".
  function hasDraftContent(draft: number | string | null) {
    if (draft === null) return false;
    return typeof draft === "string" ? draft.trim().length > 0 : true;
  }

  async function handleSaveAndNext() {
    if (!currentQuestionId) return;
    if (hasDraftContent(draftAnswer)) {
      setAnswers((prev) => ({ ...prev, [currentQuestionId]: draftAnswer! }));
      await persistAnswer(currentQuestionId, draftAnswer);
    }
    goToNextQuestionInSection();
  }

  async function handleClearResponse() {
    if (!currentQuestionId) return;
    setDraftAnswer(null);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[currentQuestionId];
      return next;
    });
    await persistAnswer(currentQuestionId, null);
  }

  async function handleMarkForReviewAndNext() {
    if (!currentQuestionId) return;
    if (hasDraftContent(draftAnswer)) {
      setAnswers((prev) => ({ ...prev, [currentQuestionId]: draftAnswer! }));
    }
    setQuestionStatus((prev) => ({ ...prev, [currentQuestionId]: { visited: true, marked_for_review: true } }));
    await persistAnswer(currentQuestionId, hasDraftContent(draftAnswer) ? draftAnswer : null, true);
    goToNextQuestionInSection();
  }

  // Shared eligibility check — a section can be switched into only if
  // it isn't already completed (never revisitable, regardless of nav
  // mode) and, under locked navigation, only if it's already current.
  // Returns whether the switch actually happened, so callers that also
  // want to land on a specific question don't do so after a blocked switch.
  function trySwitchSection(sectionId: string): boolean {
    if (sectionId === currentSectionId) return true;
    const targetAttempt = sectionAttemptFor(sectionId);
    if (targetAttempt?.status === "completed") {
      showToast("That section has already been submitted and can't be revisited.");
      return false;
    }
    if (!test?.allow_free_section_navigation) {
      showToast("Free navigation is off for this test — use \"Submit Section & Continue\" to move on.");
      return false;
    }
    setCurrentSectionId(sectionId);
    currentSectionIdRef.current = sectionId;
    return true;
  }

  function jumpToQuestion(questionId: string) {
    const q = questions.find((x) => x.id === questionId);
    if (!q) return;
    if (q.section_id !== currentSectionId) {
      if (!trySwitchSection(q.section_id)) return;
    }
    setCurrentQuestionId(questionId);
  }

  function handleSectionTabClick(sectionId: string) {
    if (!trySwitchSection(sectionId)) return;
    setCurrentQuestionId(questionsInSection(sectionId)[0]?.id ?? null);
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

  const current = questions.find((q) => q.id === currentQuestionId);
  const currentSection = sortedSections.find((s) => s.id === currentSectionId);
  const currentSectionQs = currentSectionId ? questionsInSection(currentSectionId) : [];
  const currentQIndex = current ? currentSectionQs.findIndex((q) => q.id === current.id) : -1;
  const max = test.max_violations_before_autosubmit;
  const currentSectionCompleted = currentSectionId ? sectionAttemptFor(currentSectionId)?.status === "completed" : false;
  const isLastSection = currentSection ? sortedSections[sortedSections.length - 1]?.id === currentSection.id : true;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Off-screen, never rendered visibly — exists purely so
          useCameraProctoring has frames to read from. Muted/playsInline
          so autoplay isn't blocked; positioned off-canvas rather than
          display:none since some browsers pause frame delivery on
          undisplayed video elements. */}
      {test.require_camera && (
        <video
          ref={cameraVideoRef}
          muted
          playsInline
          aria-hidden
          className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-px w-px opacity-0"
        />
      )}

      <div className="flex items-center justify-between border-b border-line/70 bg-surface/80 px-4 py-3 backdrop-blur sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-fg">{studentName}</p>
          <p className="truncate text-xs text-fg-muted">{test.class_name}</p>
        </div>
        <div className="text-right">
          <p className={`font-display text-xl tabular-nums ${remaining < 60 ? "text-warn" : "text-fg"}`}>
            {formatClock(remaining)}
          </p>
          <p className="text-xs text-fg-subtle">
            {test.timer_mode === "per_section" ? `${currentSection?.name ?? ""} timer` : "Total time"} ·{" "}
            {violationCount}/{max} violations
          </p>
        </div>
      </div>

      {/* Section tabs — NEET-style row above the question area. */}
      <div className="flex gap-1.5 overflow-x-auto border-b border-line/70 bg-surface-2/60 px-4 py-2 sm:px-6">
        {sortedSections.map((s) => {
          const sa = sectionAttemptFor(s.id);
          const completed = sa?.status === "completed";
          const isCurrent = s.id === currentSectionId;
          const locked = !isCurrent && !completed && !test.allow_free_section_navigation;
          const count = questionsInSection(s.id).length;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSectionTabClick(s.id)}
              disabled={completed}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                isCurrent
                  ? "border-accent bg-accent/15 text-accent"
                  : completed
                    ? "border-line/50 bg-surface text-fg-subtle opacity-60"
                    : "border-line text-fg-muted hover:text-fg"
              }`}
              title={locked ? "Submit the current section first" : undefined}
            >
              {locked && <Lock className="h-3 w-3" />}
              {s.name} ({count})
              {completed && " ✓"}
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:flex-row sm:gap-6 sm:p-6">
        <div ref={contentRef} className="min-w-0 flex-1 select-none space-y-4">
          {currentSectionCompleted && (
            <div className="card p-5 text-center text-sm text-fg-muted">
              This section has been submitted. {!isLastSection ? "Use the tabs above to move to another section." : "Submit the test when you're ready."}
            </div>
          )}
          {!currentSectionCompleted && current && (
            <div className="card space-y-4 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-fg-subtle">
                  {currentSection?.name} — Question {currentQIndex + 1} of {currentSectionQs.length}
                </p>
                {currentSection?.calculator_enabled && <BasicCalculator />}
              </div>
              {current.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.image_url}
                  alt=""
                  className="max-h-72 rounded-lg border border-line/70 object-contain"
                />
              )}
              <p className="text-lg font-medium text-fg">{current.prompt}</p>
              {current.question_type === "theory" ? (
                <div className="space-y-1.5">
                  <textarea
                    className="input min-h-[200px]"
                    placeholder="Write your answer here…"
                    value={typeof draftAnswer === "string" ? draftAnswer : ""}
                    onChange={(e) => setDraftAnswer(e.target.value)}
                  />
                  {(() => {
                    const wordCount = (typeof draftAnswer === "string" ? draftAnswer : "").trim().split(/\s+/).filter(Boolean).length;
                    const min = current.min_word_count ?? 150;
                    const met = wordCount >= min;
                    return (
                      <p className={`text-xs ${met ? "text-success" : "text-fg-subtle"}`}>
                        {wordCount} word{wordCount === 1 ? "" : "s"} — aim for at least {min}
                        {current.max_marks !== null && ` · worth ${current.max_marks} mark${current.max_marks === 1 ? "" : "s"}, graded manually`}
                      </p>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  {current.options.map((opt, i) => {
                    const selected = draftAnswer === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setDraftAnswer(i)}
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
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button type="button" onClick={handleSaveAndNext} className="btn-primary py-1.5 text-xs">
                  Save &amp; Next
                </button>
                <button type="button" onClick={handleClearResponse} className="btn-secondary py-1.5 text-xs">
                  Clear Response
                </button>
                <button type="button" onClick={handleMarkForReviewAndNext} className="btn-secondary py-1.5 text-xs">
                  Mark for Review &amp; Next
                </button>
              </div>

              {!test.allow_free_section_navigation && (
                <div className="flex justify-end border-t border-line/70 pt-3">
                  <button type="button" onClick={handleSubmitSectionAndContinue} className="btn-secondary py-1.5 text-xs">
                    {isLastSection ? "Submit Section" : "Submit Section & Continue"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-4 sm:w-56">
          <SectionQuestionPalette
            sections={sortedSections}
            questions={questions}
            answers={answers}
            questionStatus={questionStatus}
            currentQuestionId={currentQuestionId ?? undefined}
            onJump={jumpToQuestion}
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
