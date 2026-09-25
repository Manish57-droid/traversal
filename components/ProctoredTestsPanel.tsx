"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, ChevronUp, Download, Mic, PenLine, ShieldAlert, Trash2, Trophy } from "lucide-react";
import type {
  ProctoredLeaderboardRow,
  ProctoredSubjectWithSets,
  ProctoredTestWithQuestions,
  ProctoredViolationBreakdown,
} from "@/types";

interface TheoryQuestionToGrade {
  id: string;
  prompt: string;
  max_marks: number | null;
  min_word_count: number | null;
  answer: string;
  marks_awarded: number | null;
}

// Inline grading form for one attempt's theory answers — mirrors this
// panel's existing "expand a row to see more" pattern (TestDetail)
// rather than a separate page, since no other proctored-test detail
// lives outside this client component.
function TheoryGradingPanel({ testId, attemptId, onGraded }: { testId: string; attemptId: string; onGraded: () => void }) {
  const [studentName, setStudentName] = useState("");
  const [questions, setQuestions] = useState<TheoryQuestionToGrade[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/proctored-tests/${testId}/attempts/${attemptId}/grade`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setStudentName(data.student_name);
        setQuestions(data.questions);
        setDrafts(
          Object.fromEntries((data.questions as TheoryQuestionToGrade[]).map((q) => [q.id, q.marks_awarded === null ? "" : String(q.marks_awarded)]))
        );
      })
      .catch((err) => setError(err.message));
  }, [testId, attemptId]);

  async function saveMarks(questionId: string) {
    setSavingId(questionId);
    setError(null);
    try {
      const raw = drafts[questionId];
      const marks_awarded = raw.trim() === "" ? null : Number(raw);
      const res = await fetch(`/api/proctored-tests/${testId}/attempts/${attemptId}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_id: questionId, marks_awarded }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQuestions((prev) => prev?.map((q) => (q.id === questionId ? { ...q, marks_awarded: data.marks_awarded } : q)) ?? null);
      onGraded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingId(null);
    }
  }

  if (error && !questions) return <p className="text-xs text-red-400">{error}</p>;
  if (!questions) return <p className="text-xs text-fg-subtle">Loading answers…</p>;
  if (questions.length === 0) return <p className="text-xs text-fg-subtle">No theory questions on this test.</p>;

  return (
    <div className="space-y-3 rounded-lg border border-line/70 bg-surface-2/40 p-3">
      <p className="text-xs font-medium text-fg">Grading {studentName}'s theory answers</p>
      {questions.map((q, i) => {
        const wordCount = q.answer.trim().split(/\s+/).filter(Boolean).length;
        return (
          <div key={q.id} className="space-y-1.5 rounded-lg border border-line/70 bg-bg p-3">
            <p className="text-sm text-fg">
              <span className="mr-1 text-fg-subtle">{i + 1}.</span>
              {q.prompt}
            </p>
            {q.answer ? (
              <div className="rounded-lg border border-line/50 bg-surface-2/60 px-3 py-2 text-sm text-fg">
                <p className="whitespace-pre-wrap">{q.answer}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {wordCount} word{wordCount === 1 ? "" : "s"}
                  {q.min_word_count && wordCount < q.min_word_count && ` — under the ${q.min_word_count}-word guideline`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-fg-subtle">Not answered.</p>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={q.max_marks ?? undefined}
                step="0.5"
                className="input w-24 py-1.5 text-xs"
                placeholder="0"
                value={drafts[q.id] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
              />
              <span className="text-xs text-fg-muted">/ {q.max_marks} marks</span>
              <button
                type="button"
                onClick={() => saveMarks(q.id)}
                disabled={savingId === q.id}
                className="btn-secondary py-1 text-xs"
              >
                {savingId === q.id ? "Saving..." : q.marks_awarded !== null ? "Update" : "Save"}
              </button>
              {q.marks_awarded !== null && <span className="text-xs text-success">Graded: {q.marks_awarded}</span>}
            </div>
          </div>
        );
      })}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

const VIOLATION_LABEL: Record<string, string> = {
  tab_switch: "Tab switch",
  fullscreen_exit: "Fullscreen exit",
  copy_attempt: "Copy attempt",
  camera_off: "Camera off",
  phone_detected: "Phone visible",
  multiple_people: "Multiple people",
  talking_detected: "Talking detected",
};

function TestDetail({ testId }: { testId: string }) {
  const [attempts, setAttempts] = useState<ProctoredViolationBreakdown[] | null>(null);
  const [leaderboard, setLeaderboard] = useState<ProctoredLeaderboardRow[] | null>(null);
  const [released, setReleased] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [gradingAttemptId, setGradingAttemptId] = useState<string | null>(null);

  function load() {
    Promise.all([
      fetch(`/api/proctored-tests/${testId}/attempts`).then((r) => r.json()),
      fetch(`/api/proctored-tests/${testId}`).then((r) => r.json()),
    ]).then(([attemptsData, testData]) => {
      setAttempts(attemptsData.attempts ?? []);
      setLeaderboard(attemptsData.leaderboard ?? []);
      setReleased(testData.test?.results_released ?? false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  async function toggleRelease() {
    if (released === null) return;
    setBusy(true);
    const res = await fetch(`/api/proctored-tests/${testId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results_released: !released }),
    });
    if (res.ok) setReleased(!released);
    setBusy(false);
  }

  return (
    <div className="space-y-4 border-t border-line/70 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-muted">
          {released
            ? "Results are released — students can see their full right/wrong review."
            : "Results are not released yet — students only see their score."}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <a href={`/api/proctored-tests/${testId}/report`} className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Download Report
          </a>
          <a
            href={`/api/proctored-tests/${testId}/questions-export`}
            className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            Download Question Bank
          </a>
          <button onClick={toggleRelease} disabled={busy || released === null} className="btn-secondary py-1.5 text-xs">
            {busy ? "Saving..." : released ? "Unrelease results" : "Release results"}
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowLeaderboard((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-fg hover:text-accent"
        >
          <Trophy className="h-3.5 w-3.5" />
          Leaderboard ({leaderboard?.length ?? 0})
          <ChevronDown className={`h-3 w-3 transition-transform ${showLeaderboard ? "rotate-180" : ""}`} />
        </button>
        <p className="mt-1 text-xs text-fg-subtle">
          Always visible to you regardless of release status — students only see this once you release results.
        </p>

        {showLeaderboard && (
          <div className="mt-2 overflow-x-auto">
            {leaderboard?.length === 0 ? (
              <p className="text-xs text-fg-subtle">No finished attempts to rank yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line/70 text-xs text-fg-subtle">
                    <th className="pb-2 pr-3 font-medium">Rank</th>
                    <th className="pb-2 pr-3 font-medium">Student</th>
                    <th className="pb-2 pr-3 font-medium">Score</th>
                    <th className="pb-2 pr-3 font-medium">Time taken</th>
                    <th className="pb-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard?.map((row) => (
                    <tr key={row.attempt_id} className="border-b border-line/40 text-fg last:border-0">
                      <td className="py-2 pr-3 font-display">#{row.rank}</td>
                      <td className="py-2 pr-3">{row.student_name}</td>
                      <td className="py-2 pr-3">
                        {row.score}
                        {(row.max_score ?? row.total_questions) !== null && `/${row.max_score ?? row.total_questions}`}
                      </td>
                      <td className="py-2 pr-3 text-fg-muted">{formatDuration(row.time_taken_seconds)}</td>
                      <td className="py-2 text-fg-muted">{new Date(row.submitted_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {attempts === null && <p className="text-xs text-fg-subtle">Loading attempts…</p>}
      {attempts?.length === 0 && <p className="text-xs text-fg-subtle">No student has attempted this test yet.</p>}
      {attempts && attempts.length > 0 && (
        <div className="space-y-2">
          {attempts.map((a) => (
            <div key={a.attempt_id} className="rounded-lg border border-line/70 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{a.student_name}</p>
                  <p className="text-xs text-fg-muted">
                    {a.status}
                    {a.score !== null &&
                      (a.max_score ?? a.total_questions) !== null &&
                      ` · ${a.score}/${a.max_score ?? a.total_questions}`}
                    {a.grading_status === "pending" && <span className="text-warn"> · theory ungraded</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {a.grading_status !== "not_required" && a.status !== "in_progress" && (
                    <button
                      type="button"
                      onClick={() => setGradingAttemptId((cur) => (cur === a.attempt_id ? null : a.attempt_id))}
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
                        a.grading_status === "pending"
                          ? "border-warn/40 bg-warn/10 text-warn"
                          : "border-success/40 bg-success/10 text-success"
                      }`}
                    >
                      <PenLine className="h-3 w-3" />
                      {a.grading_status === "pending" ? "Grade theory" : "Graded"}
                    </button>
                  )}
                  <span className="flex items-center gap-1 text-xs text-fg-subtle">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    {a.violation_count} violation{a.violation_count === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              {Object.keys(a.violations_by_type).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(a.violations_by_type).map(([type, count]) => (
                    <span key={type} className="rounded-full border border-line/70 px-2 py-0.5 text-xs text-fg-muted">
                      {VIOLATION_LABEL[type] ?? type}: {count}
                    </span>
                  ))}
                </div>
              )}
              {gradingAttemptId === a.attempt_id && (
                <div className="mt-2">
                  <TheoryGradingPanel testId={testId} attemptId={a.attempt_id} onGraded={load} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface SectionForm {
  clientId: string;
  name: string;
  subject_id: string;
  set_ids: string[];
  time_limit_minutes: string;
  negative_marking_fraction: string;
  calculator_enabled: boolean;
}

let sectionIdCounter = 0;
function newSection(): SectionForm {
  sectionIdCounter += 1;
  return {
    clientId: `section-${sectionIdCounter}`,
    name: "",
    subject_id: "",
    set_ids: [],
    time_limit_minutes: "",
    negative_marking_fraction: "",
    calculator_enabled: false,
  };
}

const EMPTY_FORM = {
  name: "",
  description: "",
  time_limit_minutes: 30,
  negative_marking_fraction: 0,
  max_violations_before_autosubmit: 3,
  require_camera: false,
  require_mic: false,
  timer_mode: "combined" as "combined" | "per_section",
  allow_free_section_navigation: true,
};

function SectionEditor({
  section,
  index,
  total,
  subjects,
  timerMode,
  onChange,
  onRemove,
  onMove,
}: {
  section: SectionForm;
  index: number;
  total: number;
  subjects: ProctoredSubjectWithSets[];
  timerMode: "combined" | "per_section";
  onChange: (patch: Partial<SectionForm>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const subject = subjects.find((s) => s.id === section.subject_id);
  const questionCount = (subject?.sets ?? [])
    .filter((s) => section.set_ids.includes(s.id))
    .reduce((sum, s) => sum + s.question_count, 0);

  function toggleSet(setId: string) {
    onChange({ set_ids: section.set_ids.includes(setId) ? section.set_ids.filter((id) => id !== setId) : [...section.set_ids, setId] });
  }

  return (
    <div className="rounded-lg border border-line/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-fg-subtle">Section {index + 1}</span>
        <div className="flex items-center gap-2 text-xs">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className="text-fg-muted hover:text-fg disabled:opacity-30" aria-label="Move up">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} className="text-fg-muted hover:text-fg disabled:opacity-30" aria-label="Move down">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onRemove} className="text-fg-subtle hover:text-red-400" aria-label="Remove section">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Section name</label>
          <input
            className="input"
            placeholder="e.g. Quantitative"
            value={section.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Subject</label>
          <select
            className="input"
            value={section.subject_id}
            onChange={(e) => onChange({ subject_id: e.target.value, set_ids: [] })}
          >
            <option value="">Select subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {section.subject_id && (
        <div className="mt-2">
          <label className="mb-1 block text-xs text-fg-muted">Sets to include</label>
          {(subject?.sets ?? []).length === 0 && <p className="text-xs text-fg-subtle">This subject has no Sets yet.</p>}
          <div className="flex flex-wrap gap-2">
            {(subject?.sets ?? []).map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  section.set_ids.includes(s.id) ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-fg-muted"
                }`}
              >
                <input type="checkbox" className="sr-only" checked={section.set_ids.includes(s.id)} onChange={() => toggleSet(s.id)} />
                {s.name} ({s.question_count})
              </label>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-xs text-fg-subtle">
        {questionCount} question{questionCount === 1 ? "" : "s"} in this section
        {questionCount === 0 && section.set_ids.length > 0 && " — enabled Sets are empty"}
      </p>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-fg-muted">
            Time limit (min){timerMode === "combined" && " — ignored (Combined)"}
          </label>
          <input
            type="number"
            min={1}
            className="input"
            placeholder="Inherit"
            value={section.time_limit_minutes}
            onChange={(e) => onChange({ time_limit_minutes: e.target.value })}
            disabled={timerMode === "combined"}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Negative marking override</label>
          <input
            type="number"
            step="0.05"
            min={0}
            className="input"
            placeholder="Inherit test value"
            value={section.negative_marking_fraction}
            onChange={(e) => onChange({ negative_marking_fraction: e.target.value })}
          />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" checked={section.calculator_enabled} onChange={(e) => onChange({ calculator_enabled: e.target.checked })} />
            Calculator allowed
          </label>
        </div>
      </div>
    </div>
  );
}

// Only rendered for a class where the caller already has
// owner/collaborator/admin authorization (gated by the parent, same
// as ClassAccessPanel) — every request here still re-checks
// authorization server-side, this just controls visibility.
export default function ProctoredTestsPanel({ classId }: { classId: string }) {
  const [tests, setTests] = useState<ProctoredTestWithQuestions[]>([]);
  const [subjects, setSubjects] = useState<ProctoredSubjectWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sections, setSections] = useState<SectionForm[]>([newSection()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [testsRes, subjectsRes] = await Promise.all([
      fetch(`/api/proctored-tests?classId=${classId}`),
      fetch("/api/proctored-subjects"),
    ]);
    const testsData = await testsRes.json();
    const subjectsData = await subjectsRes.json();
    setTests(testsData.tests ?? []);
    setSubjects(subjectsData.subjects ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  function updateSection(clientId: string, patch: Partial<SectionForm>) {
    setSections((prev) => prev.map((s) => (s.clientId === clientId ? { ...s, ...patch } : s)));
  }

  function removeSection(clientId: string) {
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.clientId !== clientId) : prev));
  }

  function moveSection(clientId: string, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.clientId === clientId);
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  const totalQuestionCount = useMemo(() => {
    return sections.reduce((sum, section) => {
      const subject = subjects.find((s) => s.id === section.subject_id);
      const count = (subject?.sets ?? [])
        .filter((s) => section.set_ids.includes(s.id))
        .reduce((n, s) => n + s.question_count, 0);
      return sum + count;
    }, 0);
  }, [sections, subjects]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setSections([newSection()]);
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        class_id: classId,
        ...form,
        sections: sections.map((s) => ({
          name: s.name,
          subject_id: s.subject_id,
          set_ids: s.set_ids,
          time_limit_minutes: s.time_limit_minutes === "" ? null : Number(s.time_limit_minutes),
          negative_marking_fraction: s.negative_marking_fraction === "" ? null : Number(s.negative_marking_fraction),
          calculator_enabled: s.calculator_enabled,
        })),
      };
      const res = await fetch("/api/proctored-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      resetForm();
      setShowForm(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="card space-y-5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-fg">Proctored tests</p>
          <p className="text-xs text-fg-muted">Timed, multi-section MCQ exams for this class, built from the question bank.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-secondary py-1.5 text-xs">
          {showForm ? "Cancel" : "Create test"}
        </button>
      </div>

      <div className="space-y-2">
        {tests.length === 0 && <p className="text-xs text-fg-subtle">No proctored tests yet.</p>}
        {tests.map((t) => (
          <div key={t.id} className="rounded-lg border border-line/70 px-3 py-2">
            <button
              type="button"
              onClick={() => setExpandedTestId((cur) => (cur === t.id ? null : t.id))}
              className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{t.name}</p>
                <p className="text-xs text-fg-muted">
                  {t.question_count} question{t.question_count === 1 ? "" : "s"} ·{" "}
                  {t.timer_mode === "per_section" ? "Per-section timer" : `${t.time_limit_minutes} min`}
                  {t.negative_marking_fraction > 0 && ` · -${t.negative_marking_fraction} per wrong`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-fg-subtle">
                {t.require_camera && <Camera className="h-3.5 w-3.5" />}
                {t.require_mic && <Mic className="h-3.5 w-3.5" />}
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {t.max_violations_before_autosubmit}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${expandedTestId === t.id ? "rotate-180" : ""}`}
                />
              </div>
            </button>
            {expandedTestId === t.id && <TestDetail testId={t.id} />}
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="space-y-4 border-t border-line/70 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Test name</label>
              <input
                className="input"
                placeholder="TCS Preparation"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Description (optional)</label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Timer mode</label>
              <div className="flex gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="radio"
                    name="timer_mode"
                    checked={form.timer_mode === "combined"}
                    onChange={() => setForm((f) => ({ ...f, timer_mode: "combined" }))}
                  />
                  Combined
                </label>
                <label className="flex items-center gap-2 text-sm text-fg">
                  <input
                    type="radio"
                    name="timer_mode"
                    checked={form.timer_mode === "per_section"}
                    onChange={() => setForm((f) => ({ ...f, timer_mode: "per_section" }))}
                  />
                  Per-section
                </label>
              </div>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-2 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={form.allow_free_section_navigation}
                  onChange={(e) => setForm((f) => ({ ...f, allow_free_section_navigation: e.target.checked }))}
                />
                Allow free navigation between sections
              </label>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">
                Overall time limit (minutes){form.timer_mode === "per_section" && " — used as a fallback"}
              </label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.time_limit_minutes}
                onChange={(e) => setForm((f) => ({ ...f, time_limit_minutes: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Negative marking (0 = off)</label>
              <input
                type="number"
                step="0.05"
                min={0}
                className="input"
                value={form.negative_marking_fraction}
                onChange={(e) => setForm((f) => ({ ...f, negative_marking_fraction: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Violation threshold before auto-submit</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.max_violations_before_autosubmit}
                onChange={(e) => setForm((f) => ({ ...f, max_violations_before_autosubmit: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={form.require_camera}
                onChange={(e) => setForm((f) => ({ ...f, require_camera: e.target.checked }))}
              />
              Require camera
            </label>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={form.require_mic}
                onChange={(e) => setForm((f) => ({ ...f, require_mic: e.target.checked }))}
              />
              Require mic
            </label>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-fg-muted">
                Sections — <span className={totalQuestionCount > 0 ? "text-success" : "text-warn"}>{totalQuestionCount} question{totalQuestionCount === 1 ? "" : "s"} total</span>
              </p>
              <button type="button" onClick={() => setSections((prev) => [...prev, newSection()])} className="text-xs text-success hover:underline">
                + Add section
              </button>
            </div>
            {subjects.length === 0 && (
              <p className="mb-2 text-xs text-fg-subtle">
                No Subjects in the proctored bank yet — add some from the Proctored Questions page first.
              </p>
            )}
            <div className="space-y-2">
              {sections.map((section, i) => (
                <SectionEditor
                  key={section.clientId}
                  section={section}
                  index={i}
                  total={sections.length}
                  subjects={subjects}
                  timerMode={form.timer_mode}
                  onChange={(patch) => updateSection(section.clientId, patch)}
                  onRemove={() => removeSection(section.clientId)}
                  onMove={(dir) => moveSection(section.clientId, dir)}
                />
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting || totalQuestionCount === 0}>
            {submitting ? "Creating..." : "Create test"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
