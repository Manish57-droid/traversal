"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, BookOpen } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import StatTile from "@/components/StatTile";
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

// Same "border-x/40 bg-x/10 text-x" filled-pill convention used for
// difficulty badges elsewhere — a status is scannable at a glance
// instead of reading as plain muted text in a table cell.
const ATTEMPT_STATUS_STYLE: Record<string, string> = {
  not_started: "border-line/70 bg-surface-2 text-fg-muted",
  in_progress: "border-accent/40 bg-accent/10 text-accent",
  submitted: "border-success/40 bg-success/10 text-success",
  auto_submitted_violation: "border-warn/40 bg-warn/10 text-warn",
  expired: "border-warn/40 bg-warn/10 text-warn",
};

const MAX_TOPICS_SHOWN = 6;

function CompletionDonut({ completed, notCompleted, pct }: { completed: number; notCompleted: number; pct: number }) {
  const data = [
    { name: "Completed", value: completed, color: "rgb(var(--success))" },
    { name: "Not completed", value: notCompleted || (completed === 0 ? 1 : 0), color: "rgb(var(--surface-2))" },
  ];
  return (
    <div className="relative mx-auto h-40 w-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl text-fg">{Math.round(pct)}%</span>
        <span className="text-xs text-fg-muted">complete</span>
      </div>
    </div>
  );
}

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
  const notCompleted = total - completed;
  const pct = total ? (completed / total) * 100 : 0;

  const topicBreakdown = useMemo(() => {
    const byTopic = rows.reduce<Record<string, { total: number; completed: number }>>((acc, r) => {
      const key = r.questions.topic || "Uncategorized";
      acc[key] ??= { total: 0, completed: 0 };
      acc[key].total += 1;
      if (r.status === "completed") acc[key].completed += 1;
      return acc;
    }, {});
    return Object.entries(byTopic).sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

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
          <StatTile icon={CheckCircle2} label="Completed" value={completed} tint="success" />
          <StatTile icon={Circle} label="Not completed" value={notCompleted} tint="muted" />
          <StatTile icon={BookOpen} label="Total on sheet" value={total} tint="accent" />
        </div>
      )}

      {!loading && total > 0 && (
        <div className="card flex flex-col items-center gap-2 p-5 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
          <CompletionDonut completed={completed} notCompleted={notCompleted} pct={pct} />
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-fg">Overall completion</p>
            <p className="mt-1 text-xs text-fg-muted">
              {completed} of {total} question{total === 1 ? "" : "s"} checked off.
            </p>
          </div>
        </div>
      )}

      {topicBreakdown.length > 0 && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-fg">By topic</h2>
            {topicBreakdown.length > MAX_TOPICS_SHOWN && (
              <Link href="/student/dsa" className="text-xs text-success hover:underline">
                View full breakdown on the DSA sheet →
              </Link>
            )}
          </div>
          <div className="space-y-4">
            {topicBreakdown.slice(0, MAX_TOPICS_SHOWN).map(([topic, stats]) => (
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
          <div className="space-y-2">
            {attemptedTests.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{t.name}</p>
                  <p className="text-xs text-fg-muted">
                    {t.class_name}
                    {t.submitted_at && ` · ${new Date(t.submitted_at).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs ${ATTEMPT_STATUS_STYLE[t.attempt_status] ?? ATTEMPT_STATUS_STYLE.not_started}`}
                  >
                    {ATTEMPT_STATUS_LABEL[t.attempt_status] ?? t.attempt_status}
                  </span>
                  {t.results_released ? (
                    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-fg">
                      {t.score !== null && (t.max_score ?? t.total_questions) !== null
                        ? `${t.score}/${t.max_score ?? t.total_questions}`
                        : "—"}
                      {t.rank !== null && ` · #${t.rank}`}
                    </span>
                  ) : (
                    <span className="text-xs text-fg-subtle">Not released</span>
                  )}
                </div>
              </div>
            ))}
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
