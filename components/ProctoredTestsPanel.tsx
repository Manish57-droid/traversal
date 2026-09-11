"use client";

import { useEffect, useState } from "react";
import { Camera, ChevronDown, Mic, ShieldAlert } from "lucide-react";
import type { ProctoredQuestion, ProctoredTestWithQuestions, ProctoredViolationBreakdown } from "@/types";

const VIOLATION_LABEL: Record<string, string> = {
  tab_switch: "Tab switch",
  fullscreen_exit: "Fullscreen exit",
  copy_attempt: "Copy attempt",
  camera_off: "Camera off",
};

function TestDetail({ testId }: { testId: string }) {
  const [attempts, setAttempts] = useState<ProctoredViolationBreakdown[] | null>(null);
  const [released, setReleased] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/proctored-tests/${testId}/attempts`).then((r) => r.json()),
      fetch(`/api/proctored-tests/${testId}`).then((r) => r.json()),
    ]).then(([attemptsData, testData]) => {
      setAttempts(attemptsData.attempts ?? []);
      setReleased(testData.test?.results_released ?? false);
    });
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
        <button onClick={toggleRelease} disabled={busy || released === null} className="btn-secondary py-1.5 text-xs">
          {busy ? "Saving..." : released ? "Unrelease results" : "Release results"}
        </button>
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
                    {a.score !== null && a.total_questions !== null && ` · ${a.score}/${a.total_questions}`}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-fg-subtle">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {a.violation_count} violation{a.violation_count === 1 ? "" : "s"}
                </span>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  description: "",
  time_limit_minutes: 30,
  negative_marking_fraction: 0,
  max_violations_before_autosubmit: 3,
  require_camera: false,
  require_mic: false,
};

// Only rendered for a class where the caller already has
// owner/collaborator/admin authorization (gated by the parent, same
// as ClassAccessPanel) — every request here still re-checks
// authorization server-side, this just controls visibility.
export default function ProctoredTestsPanel({ classId }: { classId: string }) {
  const [tests, setTests] = useState<ProctoredTestWithQuestions[]>([]);
  const [bank, setBank] = useState<ProctoredQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [randomCount, setRandomCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [testsRes, bankRes] = await Promise.all([
      fetch(`/api/proctored-tests?classId=${classId}`),
      fetch("/api/proctored-questions"),
    ]);
    const testsData = await testsRes.json();
    const bankData = await bankRes.json();
    setTests(testsData.tests ?? []);
    setBank(bankData.questions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]));
  }

  function pickRandom() {
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    setSelectedIds(shuffled.slice(0, Math.min(randomCount, bank.length)).map((q) => q.id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || selectedIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/proctored-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, ...form, question_ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(EMPTY_FORM);
      setSelectedIds([]);
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
          <p className="text-xs text-fg-muted">Timed MCQ exams for this class, from a dedicated question bank.</p>
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
                  {t.question_count} question{t.question_count === 1 ? "" : "s"} · {t.time_limit_minutes} min
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
                placeholder="Mock Placement Drive 1"
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

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Time limit (minutes)</label>
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
                Pick questions from the bank ({selectedIds.length} selected)
              </p>
              {bank.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    className="input w-16 py-1 text-xs"
                    value={randomCount}
                    onChange={(e) => setRandomCount(Number(e.target.value))}
                  />
                  <button type="button" onClick={pickRandom} className="text-xs text-success hover:underline">
                    Pick N random
                  </button>
                </div>
              )}
            </div>
            {bank.length === 0 && (
              <p className="text-xs text-fg-subtle">
                No questions in the proctored bank yet — add some from the Proctored Questions page first.
              </p>
            )}
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {bank.map((q) => (
                <label key={q.id} className="flex items-start gap-2 rounded-lg border border-line/70 px-3 py-2 text-sm hover:border-line">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                  />
                  <span className="text-fg">{q.prompt}</span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting || selectedIds.length === 0}>
            {submitting ? "Creating..." : "Create test"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
