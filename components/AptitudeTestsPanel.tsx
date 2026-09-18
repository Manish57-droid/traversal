"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AptitudeAttemptRollup, AptitudeCategory, AptitudeQuestion, AptitudeTestWithQuestions } from "@/types";

const CATEGORIES: AptitudeCategory[] = ["quant", "logical", "verbal"];
const CATEGORY_LABELS: Record<AptitudeCategory, string> = {
  quant: "Quant",
  logical: "Logical",
  verbal: "Verbal",
};

function formatTime(seconds: number | null) {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function scoreDistribution(attempts: AptitudeAttemptRollup[]) {
  const finished = attempts.filter((a) => a.score !== null);
  if (finished.length === 0) return [];
  const max = Math.max(...finished.map((a) => a.total_questions ?? 0), 1);
  const bucketSize = Math.max(1, Math.ceil(max / 5));
  const buckets = new Map<string, number>();
  for (const a of finished) {
    const score = a.score ?? 0;
    const bucketStart = Math.floor(score / bucketSize) * bucketSize;
    const label = `${bucketStart}-${bucketStart + bucketSize - 1}`;
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }
  return Array.from(buckets.entries()).map(([range, count]) => ({ range, count }));
}

function TestDetail({ testId }: { testId: string }) {
  const [attempts, setAttempts] = useState<AptitudeAttemptRollup[] | null>(null);
  const [released, setReleased] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/aptitude/tests/${testId}/attempts`).then((r) => r.json()),
      fetch(`/api/aptitude/tests/${testId}`).then((r) => r.json()),
    ]).then(([attemptsData, testData]) => {
      setAttempts(attemptsData.attempts ?? []);
      setReleased(testData.test?.results_released ?? false);
    });
  }, [testId]);

  async function toggleRelease() {
    if (released === null) return;
    setBusy(true);
    const res = await fetch(`/api/aptitude/tests/${testId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results_released: !released }),
    });
    if (res.ok) setReleased(!released);
    setBusy(false);
  }

  const finishedCount = attempts?.filter((a) => a.score !== null).length ?? 0;
  const avgScore =
    finishedCount > 0
      ? Math.round(
          ((attempts!.filter((a) => a.score !== null).reduce((sum, a) => sum + (a.score ?? 0), 0)) / finishedCount) * 100
        ) / 100
      : null;
  const distribution = attempts ? scoreDistribution(attempts) : [];

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

      {attempts === null && <p className="text-xs text-fg-subtle">Loading results…</p>}
      {attempts?.length === 0 && <p className="text-xs text-fg-subtle">No student has attempted this test yet.</p>}

      {attempts && attempts.length > 0 && (
        <>
          <div className="flex flex-wrap gap-4 text-xs text-fg-muted">
            <span>{attempts.length} attempt{attempts.length === 1 ? "" : "s"}</span>
            <span>{finishedCount} finished</span>
            {avgScore !== null && <span>Average score: {avgScore}</span>}
          </div>

          {distribution.length > 0 && (
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--line) / 0.4)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "rgb(var(--fg-muted))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "rgb(var(--fg-muted))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "rgb(var(--surface))",
                      border: "1px solid rgb(var(--line) / 0.7)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="rgb(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="space-y-2">
            {attempts.map((a) => (
              <div key={a.attempt_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/70 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{a.student_name}</p>
                  <p className="text-xs text-fg-muted">
                    {a.status}
                    {a.score !== null && a.total_questions !== null && ` · ${a.score}/${a.total_questions}`}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-fg-subtle">{formatTime(a.time_taken_seconds)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "" as "" | AptitudeCategory,
  time_limit_minutes: 30,
  negative_marking_fraction: 0,
  due_date: "",
};

// Only rendered for a class where the caller already has
// owner/collaborator/admin authorization (gated by the parent, same
// as ClassAccessPanel and ProctoredTestsPanel).
export default function AptitudeTestsPanel({ classId }: { classId: string }) {
  const [tests, setTests] = useState<AptitudeTestWithQuestions[]>([]);
  const [bank, setBank] = useState<AptitudeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [randomCategory, setRandomCategory] = useState<AptitudeCategory>("quant");
  const [randomTopic, setRandomTopic] = useState("");
  const [randomCount, setRandomCount] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [testsRes, bankRes] = await Promise.all([
      fetch(`/api/aptitude/tests?classId=${classId}`),
      fetch("/api/aptitude/questions"),
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

  const topicsForRandomCategory = useMemo(
    () => Array.from(new Set(bank.filter((q) => q.category === randomCategory).map((q) => q.topic))).sort(),
    [bank, randomCategory]
  );

  function toggleQuestion(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]));
  }

  function pickRandom() {
    const pool = bank.filter((q) => q.category === randomCategory && (!randomTopic || q.topic === randomTopic));
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    setSelectedIds(shuffled.slice(0, Math.min(randomCount, pool.length)).map((q) => q.id));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || selectedIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/aptitude/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: classId,
          ...form,
          category: form.category || null,
          due_date: form.due_date || null,
          question_ids: selectedIds,
        }),
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
          <p className="text-sm font-medium text-fg">Aptitude tests</p>
          <p className="text-xs text-fg-muted">Timed, scored MCQ tests for this class, from the Aptitude question bank.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-secondary py-1.5 text-xs">
          {showForm ? "Cancel" : "Create test"}
        </button>
      </div>

      <div className="space-y-2">
        {tests.length === 0 && <p className="text-xs text-fg-subtle">No aptitude tests yet.</p>}
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
                  {t.category ? CATEGORY_LABELS[t.category] : "Mixed"} · {t.question_count} question
                  {t.question_count === 1 ? "" : "s"} · {t.time_limit_minutes} min
                  {t.negative_marking_fraction > 0 && ` · -${t.negative_marking_fraction} per wrong`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-fg-subtle">
                {t.due_date && <span>Due {t.due_date}</span>}
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
                placeholder="Weekly Aptitude Test 1"
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

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AptitudeCategory | "" }))}
              >
                <option value="">Mixed</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
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
              <label className="mb-1 block text-xs text-fg-muted">Due date (optional)</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-fg-muted">
                Pick questions from the bank ({selectedIds.length} selected)
              </p>
              {bank.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="input w-auto py-1 text-xs"
                    value={randomCategory}
                    onChange={(e) => {
                      setRandomCategory(e.target.value as AptitudeCategory);
                      setRandomTopic("");
                    }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                  </select>
                  <select
                    className="input w-auto py-1 text-xs"
                    value={randomTopic}
                    onChange={(e) => setRandomTopic(e.target.value)}
                  >
                    <option value="">Any topic</option>
                    {topicsForRandomCategory.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
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
                No questions in the Aptitude bank yet — add some from the Aptitude Questions page first.
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
                  <span className="text-fg">
                    <span className="mr-1 text-xs text-fg-subtle">
                      [{CATEGORY_LABELS[q.category]} · {q.topic}]
                    </span>
                    {q.prompt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={submitting || selectedIds.length === 0}>
            {submitting ? "Creating..." : "Create & assign test"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      )}
    </div>
  );
}
