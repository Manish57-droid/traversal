"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PLATFORM_LABELS } from "@/lib/platform";
import type { QuestionStatus, StudentAnalyticsDetail } from "@/types";

const STATUS_LABEL: Record<QuestionStatus, string> = {
  not_started: "Not started",
  attempted: "Attempted",
  completed: "Completed",
};

// Overlay, not a page navigation — fixed backdrop + a right-hand panel,
// closes on backdrop click, the X, or Escape.
export default function StudentDrawer({
  studentId,
  classId,
  onClose,
}: {
  studentId: string;
  classId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<StudentAnalyticsDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/teacher/analytics/student/${studentId}?classId=${classId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setDetail(d.detail ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [studentId, classId]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-bg/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-lg overflow-y-auto border-l border-line bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-xl text-fg">{detail?.full_name || detail?.email || "Student"}</p>
            {detail?.full_name && <p className="truncate text-xs text-fg-muted">{detail.email}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading && <p className="mt-6 text-sm text-fg-muted">Loading…</p>}
        {error && <p className="mt-6 text-sm text-warn">{error}</p>}

        {!loading && detail && (
          <div className="mt-6 space-y-8">
            <section>
              <p className="text-sm font-medium text-fg">DSA questions ({detail.dsa.length})</p>
              <div className="mt-3 space-y-2">
                {detail.dsa.map((q) => (
                  <div key={q.question_id} className="card flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-fg">{q.title}</p>
                      <p className="text-xs text-fg-muted">{PLATFORM_LABELS[q.platform]}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                        q.status === "completed"
                          ? "border-success/40 text-success"
                          : q.status === "attempted"
                          ? "border-warn/40 text-warn"
                          : "border-line text-fg-subtle"
                      }`}
                    >
                      {STATUS_LABEL[q.status]}
                    </span>
                  </div>
                ))}
                {detail.dsa.length === 0 && <p className="text-sm text-fg-subtle">No DSA questions assigned yet.</p>}
              </div>
            </section>

            <section>
              <p className="text-sm font-medium text-fg">Aptitude questions ({detail.aptitude.length})</p>
              <div className="mt-3 space-y-2">
                {detail.aptitude.map((q) => (
                  <div key={q.question_id} className="card flex items-center justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-fg">{q.topic}</p>
                      <p className="text-xs capitalize text-fg-muted">
                        {q.category} · {q.attempts_count} attempt{q.attempts_count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                        q.last_correct === true
                          ? "border-success/40 text-success"
                          : q.last_correct === false
                          ? "border-warn/40 text-warn"
                          : "border-line text-fg-subtle"
                      }`}
                    >
                      {q.last_correct === true ? "Correct" : q.last_correct === false ? "Incorrect" : "—"}
                    </span>
                  </div>
                ))}
                {detail.aptitude.length === 0 && <p className="text-sm text-fg-subtle">No aptitude questions attempted yet.</p>}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
