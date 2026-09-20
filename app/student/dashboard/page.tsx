"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import ProctoredLeaderboardWidget from "@/components/ProctoredLeaderboardWidget";
import StudentNotifications from "@/components/StudentNotifications";
import type { QuestionStatus, StudentProctoredTestRow } from "@/types";

interface ProgressJoinRow {
  status: QuestionStatus;
  questions: { platform: string; topic: string | null };
}

const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  auto_submitted_violation: "Auto-submitted",
  expired: "Expired",
};

export default function StudentDashboardPage() {
  const [rows, setRows] = useState<ProgressJoinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [proctoredTests, setProctoredTests] = useState<StudentProctoredTestRow[]>([]);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d) => setRows(d.progress ?? []))
      .finally(() => setLoading(false));

    fetch("/api/student/proctored-tests")
      .then((r) => r.json())
      .then((d) => setProctoredTests(d.tests ?? []));
  }, []);

  const attemptedTests = proctoredTests.filter((t) => t.attempt_status !== "not_started");

  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const attempted = rows.filter((r) => r.status === "attempted").length;
  const pct = total ? (completed / total) * 100 : 0;

  const byTopic = rows.reduce<Record<string, { total: number; completed: number }>>((acc, r) => {
    const key = r.questions.topic || "Uncategorized";
    acc[key] ??= { total: 0, completed: 0 };
    acc[key].total += 1;
    if (r.status === "completed") acc[key].completed += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Your progress</h1>
          <p className="mt-1 text-sm text-fg-muted">A quick look at how the sheet is filling up.</p>
        </div>
        <Link href="/student/dsa" className="btn-primary">Open DSA sheet</Link>
      </div>

      <StudentNotifications />

      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs text-fg-muted">Completed</p>
            <p className="font-display text-3xl text-success">{completed}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-fg-muted">Attempted</p>
            <p className="font-display text-3xl text-warn">{attempted}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-fg-muted">Total on sheet</p>
            <p className="font-display text-3xl text-fg">{total}</p>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-fg">Overall completion</span>
          <span className="text-fg-muted">{Math.round(pct)}%</span>
        </div>
        <ProgressBar value={pct} />
      </div>

      {Object.keys(byTopic).length > 0 && (
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-fg">By topic</h2>
          <div className="space-y-4">
            {Object.entries(byTopic).map(([topic, stats]) => (
              <div key={topic}>
                <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
                  <span>{topic}</span>
                  <span>{stats.completed}/{stats.total}</span>
                </div>
                <ProgressBar value={(stats.completed / stats.total) * 100} />
              </div>
            ))}
          </div>
        </div>
      )}

      <ProctoredLeaderboardWidget />

      {attemptedTests.length > 0 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">My Proctored Tests</h2>
            <p className="text-xs text-fg-muted">
              Total tests taken: <span className="text-fg">{attemptedTests.length}</span>
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line/70 text-xs text-fg-subtle">
                  <th className="pb-2 pr-3 font-medium">Test</th>
                  <th className="pb-2 pr-3 font-medium">Class</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Score</th>
                  <th className="pb-2 pr-3 font-medium">Rank</th>
                  <th className="pb-2 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {attemptedTests.map((t) => (
                  <tr key={t.id} className="border-b border-line/40 text-fg last:border-0">
                    <td className="py-2 pr-3">{t.name}</td>
                    <td className="py-2 pr-3 text-fg-muted">{t.class_name}</td>
                    <td className="py-2 pr-3 text-fg-muted">{ATTEMPT_STATUS_LABEL[t.attempt_status] ?? t.attempt_status}</td>
                    <td className="py-2 pr-3">
                      {t.results_released ? (
                        t.score !== null && t.total_questions !== null ? `${t.score}/${t.total_questions}` : "—"
                      ) : (
                        <span className="text-fg-subtle">Not released</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {t.results_released ? (t.rank !== null ? `#${t.rank}` : "—") : <span className="text-fg-subtle">—</span>}
                    </td>
                    <td className="py-2 text-fg-muted">
                      {t.submitted_at ? new Date(t.submitted_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-medium text-fg">Classes</h2>
          <p className="mt-1 text-xs text-fg-muted">Join a new class with its code, or leave one you're already in.</p>
        </div>
        <Link href="/student/classes" className="btn-secondary shrink-0 py-2 text-xs">
          Manage my classes
        </Link>
      </div>
    </div>
  );
}
