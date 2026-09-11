"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

interface StudentProctoredTest {
  id: string;
  name: string;
  description: string | null;
  class_name: string;
  time_limit_minutes: number;
  results_released: boolean;
  attempt_status: "not_started" | "in_progress" | "submitted" | "expired" | "auto_submitted_violation";
  score: number | null;
  total_questions: number | null;
}

const STATUS_LABEL: Record<StudentProctoredTest["attempt_status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Time expired",
  auto_submitted_violation: "Auto-submitted",
};

const STATUS_STYLE: Record<StudentProctoredTest["attempt_status"], string> = {
  not_started: "border-line/70 text-fg-muted",
  in_progress: "border-warn/40 bg-warn/10 text-warn",
  submitted: "border-success/40 bg-success/10 text-success",
  expired: "border-line/70 text-fg-muted",
  auto_submitted_violation: "border-red-500/40 bg-red-500/10 text-red-400",
};

export default function StudentProctoredTestsPage() {
  const [tests, setTests] = useState<StudentProctoredTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/proctored-tests")
      .then((r) => r.json())
      .then((d) => setTests(d.tests ?? []))
      .finally(() => setLoading(false));
  }, []);

  function actionFor(t: StudentProctoredTest) {
    if (t.attempt_status === "not_started") {
      return (
        <Link href={`/student/proctored-tests/${t.id}/start`} className="btn-primary py-1.5 text-xs">
          Start test
        </Link>
      );
    }
    if (t.attempt_status === "in_progress") {
      return (
        <Link href={`/student/proctored-tests/${t.id}/take`} className="btn-primary py-1.5 text-xs">
          Resume
        </Link>
      );
    }
    if (t.results_released) {
      return (
        <Link href={`/student/proctored-tests/${t.id}/review`} className="btn-secondary py-1.5 text-xs">
          View review
        </Link>
      );
    }
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Proctored tests</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Timed exams assigned by your teacher — run in fullscreen, with your activity logged.
        </p>
      </div>

      {loading && <p className="text-sm text-fg-muted">Loading…</p>}

      {!loading && tests.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <ShieldCheck className="h-8 w-8 text-fg-subtle" />
          <p className="text-sm text-fg-muted">No proctored tests have been assigned to your classes yet.</p>
        </div>
      )}

      <div className="space-y-3">
        {tests.map((t) => (
          <div key={t.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-fg">{t.name}</p>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLE[t.attempt_status]}`}>
                  {STATUS_LABEL[t.attempt_status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-fg-muted">
                {t.class_name} · {t.time_limit_minutes} min
                {t.score !== null && t.total_questions !== null && ` · Scored ${t.score}/${t.total_questions}`}
              </p>
            </div>
            <div className="shrink-0">{actionFor(t)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
