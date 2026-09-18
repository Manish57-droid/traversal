"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";

interface AssignedTest {
  id: string;
  name: string;
  class_name: string;
  time_limit_minutes: number;
  due_date: string | null;
  results_released: boolean;
  attempt_status: "not_started" | "in_progress" | "submitted" | "expired";
  score: number | null;
  total_questions: number | null;
}

const STATUS_LABEL: Record<AssignedTest["attempt_status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  expired: "Time expired",
};

const STATUS_STYLE: Record<AssignedTest["attempt_status"], string> = {
  not_started: "border-line/70 text-fg-muted",
  in_progress: "border-warn/40 bg-warn/10 text-warn",
  submitted: "border-success/40 bg-success/10 text-success",
  expired: "border-line/70 text-fg-muted",
};

export default function AssignedAptitudeTests() {
  const [tests, setTests] = useState<AssignedTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/aptitude/tests")
      .then((r) => r.json())
      .then((d) => setTests(d.tests ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading || tests.length === 0) return null;

  function actionFor(t: AssignedTest) {
    if (t.attempt_status === "not_started" || t.attempt_status === "in_progress") {
      return (
        <Link href={`/student/aptitude/test/${t.id}`} className="btn-primary py-1.5 text-xs">
          {t.attempt_status === "in_progress" ? "Resume" : "Start test"}
        </Link>
      );
    }
    if (t.results_released) {
      return (
        <Link href={`/student/aptitude/test/${t.id}/review`} className="btn-secondary py-1.5 text-xs">
          View review
        </Link>
      );
    }
    return null;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-fg-muted" />
        <p className="text-sm font-medium text-fg">Assigned tests</p>
      </div>
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
                {t.due_date && ` · Due ${t.due_date}`}
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
