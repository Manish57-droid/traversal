"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Target, Percent, Sparkles } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import StatTile from "@/components/StatTile";
import { DIFFICULTY_LABELS, DIFFICULTY_BADGE_STYLE } from "@/lib/difficulty";
import ProctoredLeaderboardWidget from "@/components/ProctoredLeaderboardWidget";
import StudentNotifications from "@/components/StudentNotifications";
import type { Question, QuestionStatus, StudentProctoredTestRow } from "@/types";

interface ProgressJoinRow {
  question_id: string;
  status: QuestionStatus;
  questions: Question;
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

// A stable pick for the whole day (not re-randomized on every reload)
// without needing any backend state — hash today's date into an index
// over whichever easy questions are loaded. Changes once at midnight,
// same for every visit that day.
function pickQuestionOfTheDay(candidates: ProgressJoinRow[]): ProgressJoinRow | null {
  if (candidates.length === 0) return null;
  const todayKey = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < todayKey.length; i++) hash = (hash * 31 + todayKey.charCodeAt(i)) >>> 0;
  return candidates[hash % candidates.length];
}

export default function StudentDashboardPage() {
  const [rows, setRows] = useState<ProgressJoinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [proctoredTests, setProctoredTests] = useState<StudentProctoredTestRow[]>([]);
  const [aptitude, setAptitude] = useState({ attempted: 0, total: 0 });

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d) => setRows(d.progress ?? []))
      .finally(() => setLoading(false));

    fetch("/api/student/proctored-tests")
      .then((r) => r.json())
      .then((d) => setProctoredTests(d.tests ?? []));

    fetch("/api/student/aptitude-summary")
      .then((r) => r.json())
      .then((d) => setAptitude({ attempted: d.attempted ?? 0, total: d.total ?? 0 }))
      .catch(() => {});
  }, []);

  const attemptedTests = proctoredTests.filter((t) => t.attempt_status !== "not_started");

  const dsaTotal = rows.length;
  const dsaCompleted = rows.filter((r) => r.status === "completed").length;
  const dsaNotCompleted = dsaTotal - dsaCompleted;
  const dsaPct = dsaTotal ? (dsaCompleted / dsaTotal) * 100 : 0;
  const totalAttempted = dsaCompleted + aptitude.attempted;

  const questionOfTheDay = useMemo(() => {
    const easyQuestions = rows.filter((r) => r.questions.difficulty === "easy");
    return pickQuestionOfTheDay(easyQuestions.length > 0 ? easyQuestions : rows);
  }, [rows]);

  async function handleStatusChange(questionId: string, status: QuestionStatus) {
    setRows((prev) => prev.map((r) => (r.question_id === questionId ? { ...r, status } : r)));
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, status }),
    });
  }

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
          <StatTile icon={Flame} label="Questions attempted" value={totalAttempted} tint="warn" />
          <StatTile icon={Target} label="DSA progress" value={`${dsaCompleted}/${dsaTotal}`} tint="success" />
          <StatTile icon={Percent} label="Aptitude progress" value={`${aptitude.attempted}/${aptitude.total}`} tint="accent" />
        </div>
      )}

      {!loading && dsaTotal > 0 && (
        <div className="card flex flex-col items-center gap-2 p-5 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
          <CompletionDonut completed={dsaCompleted} notCompleted={dsaNotCompleted} pct={dsaPct} />
          <div className="text-center sm:text-left">
            <p className="text-sm font-medium text-fg">Overall completion</p>
            <p className="mt-1 text-xs text-fg-muted">
              {dsaCompleted} of {dsaTotal} question{dsaTotal === 1 ? "" : "s"} checked off.
            </p>
          </div>
        </div>
      )}

      {questionOfTheDay && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-warn" />
            <h2 className="text-sm font-medium text-fg">Question of the Day</h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line/70 px-4 py-3">
            <div className="min-w-0">
              {questionOfTheDay.questions.url ? (
                <a
                  href={questionOfTheDay.questions.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-fg hover:text-success hover:underline"
                >
                  {questionOfTheDay.questions.title}
                </a>
              ) : (
                <span className="font-medium text-fg-muted">{questionOfTheDay.questions.title}</span>
              )}
              {questionOfTheDay.questions.difficulty !== "unknown" && (
                <span className={`ml-2 rounded-full border px-2 py-0.5 text-xs capitalize ${DIFFICULTY_BADGE_STYLE[questionOfTheDay.questions.difficulty]}`}>
                  {DIFFICULTY_LABELS[questionOfTheDay.questions.difficulty]}
                </span>
              )}
            </div>
            <button
              onClick={() => handleStatusChange(questionOfTheDay.question_id, questionOfTheDay.status === "completed" ? "not_started" : "completed")}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                questionOfTheDay.status === "completed" ? "border-success/40 bg-success/10 text-success" : "border-line/70 hover:border-line"
              }`}
            >
              <span className={`h-3 w-3 rounded-full ${questionOfTheDay.status === "completed" ? "bg-success" : "border border-line"}`} />
              {questionOfTheDay.status === "completed" ? "Completed" : "Not completed"}
            </button>
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
