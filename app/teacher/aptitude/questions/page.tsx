"use client";

import { useEffect, useMemo, useState } from "react";
import type { AptitudeCategory, AptitudeQuestion } from "@/types";

const CATEGORIES: AptitudeCategory[] = ["quant", "logical", "verbal"];
const CATEGORY_LABELS: Record<AptitudeCategory, string> = {
  quant: "Quant",
  logical: "Logical",
  verbal: "Verbal",
};

const EMPTY_FORM = {
  category: "quant" as AptitudeCategory,
  topic: "",
  prompt: "",
  options: ["", "", "", ""],
  correct_option: 0,
  explanation: "",
  difficulty: "unknown",
};

export default function TeacherAptitudeQuestionsPage() {
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<"all" | AptitudeCategory>("all");
  const [topicFilter, setTopicFilter] = useState("");

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/aptitude/questions");
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const topics = useMemo(
    () => Array.from(new Set(questions.map((q) => q.topic))).sort(),
    [questions]
  );

  const filtered = questions.filter(
    (q) =>
      (categoryFilter === "all" || q.category === categoryFilter) &&
      (!topicFilter || q.topic === topicFilter)
  );

  function updateOption(index: number, value: string) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? value : o)) }));
  }

  function addOption() {
    setForm((f) => ({ ...f, options: [...f.options, ""] }));
  }

  function removeOption(index: number) {
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== index),
      correct_option: f.correct_option >= index && f.correct_option > 0 ? f.correct_option - 1 : f.correct_option,
    }));
  }

  function startEdit(q: AptitudeQuestion) {
    setEditingId(q.id);
    setForm({
      category: q.category,
      topic: q.topic,
      prompt: q.prompt,
      options: q.options,
      correct_option: q.correct_option,
      explanation: q.explanation ?? "",
      difficulty: q.difficulty,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cleanOptions = form.options.map((o) => o.trim()).filter(Boolean);
      const payload = { ...form, options: cleanOptions };
      const res = await fetch("/api/aptitude/questions", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cancelEdit();
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question? This can't be undone.")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    await fetch("/api/aptitude/questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Aptitude question bank</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Add MCQs here so they're ready for students to practice and, later, to build tests from.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-4">
        {editingId && (
          <div className="flex items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
            Editing a question
            <button type="button" onClick={cancelEdit} className="underline">
              Cancel
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AptitudeCategory }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Topic</label>
            <input
              className="input"
              placeholder="Time & Work"
              value={form.topic}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Difficulty</label>
            <select
              className="input"
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
            >
              <option value="unknown">Unspecified</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted">Prompt</label>
          <textarea
            className="input min-h-[80px]"
            placeholder="A does a piece of work in 10 days..."
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted">
            Options — pick the radio button next to the correct one
          </label>
          <div className="space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correct_option"
                  checked={form.correct_option === i}
                  onChange={() => setForm((f) => ({ ...f, correct_option: i }))}
                  className="shrink-0 accent-success"
                />
                <input
                  className="input"
                  placeholder={`Option ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                />
                {form.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    className="shrink-0 text-xs text-fg-subtle hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addOption} className="mt-2 text-xs text-success hover:underline">
            + Add option
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted">Explanation (shown after answering)</label>
          <textarea
            className="input min-h-[60px]"
            value={form.explanation}
            onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
          />
        </div>

        <button className="btn-primary" disabled={submitting}>
          {submitting ? "Saving..." : editingId ? "Save changes" : "Add to bank"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
              categoryFilter === c
                ? "border-success/60 bg-success/10 text-success"
                : "border-line/70 text-fg-muted hover:border-line"
            }`}
          >
            {c === "all" ? "All" : CATEGORY_LABELS[c]}
          </button>
        ))}
        {topics.length > 0 && (
          <select className="input w-auto py-1.5 text-xs" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-fg-muted">Loading…</p>}
        {!loading && filtered.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">
            No questions yet — add one above.
          </p>
        )}
        {filtered.map((q) => (
          <div key={q.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-line/70 px-2 py-0.5 text-xs capitalize text-fg-muted">
                  {CATEGORY_LABELS[q.category]}
                </span>
                <span className="rounded border border-line/70 px-2 py-0.5 text-xs text-fg-muted">
                  {q.topic}
                </span>
                {q.difficulty !== "unknown" && (
                  <span className="text-xs capitalize text-fg-muted">{q.difficulty}</span>
                )}
              </div>
              <p className="mt-1 font-medium text-fg">{q.prompt}</p>
              <ul className="mt-2 space-y-0.5 text-xs text-fg-muted">
                {q.options.map((opt, i) => (
                  <li key={i} className={i === q.correct_option ? "text-success" : ""}>
                    {i === q.correct_option ? "✓ " : "· "}
                    {opt}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 gap-3 text-xs">
              <button onClick={() => startEdit(q)} className="text-fg-muted hover:text-fg">
                Edit
              </button>
              <button onClick={() => handleDelete(q.id)} className="text-fg-subtle hover:text-red-400">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
