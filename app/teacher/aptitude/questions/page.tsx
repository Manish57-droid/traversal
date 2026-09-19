"use client";

import { useEffect, useMemo, useState } from "react";
import type { AptitudeCategory, AptitudeQuestion, AptitudeTopicWithCount } from "@/types";
import FolderSection from "@/components/FolderSection";
import { APTITUDE_TOPIC_SUGGESTIONS } from "@/lib/aptitudeTopics";

const CATEGORIES: AptitudeCategory[] = ["quant", "logical", "verbal"];
const CATEGORY_LABELS: Record<AptitudeCategory, string> = {
  quant: "Quant",
  logical: "Logical",
  verbal: "Verbal",
};

const EMPTY_FORM = {
  category: "quant" as AptitudeCategory,
  topic_id: "",
  prompt: "",
  options: ["", "", "", ""],
  correct_option: 0,
  explanation: "",
  difficulty: "unknown",
};

export default function TeacherAptitudeQuestionsPage() {
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [topics, setTopics] = useState<AptitudeTopicWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [creatingTopic, setCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [savingNewTopic, setSavingNewTopic] = useState(false);
  const [newTopicError, setNewTopicError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/aptitude/questions");
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setLoading(false);
  }

  async function loadTopics() {
    const res = await fetch("/api/aptitude-topics");
    const data = await res.json();
    setTopics(data.topics ?? []);
  }

  useEffect(() => {
    load();
    loadTopics();
  }, []);

  const topicsForFormCategory = useMemo(
    () => topics.filter((t) => t.category === form.category),
    [topics, form.category]
  );

  const groupsByCategory = useMemo(() => {
    const result = new Map<AptitudeCategory, { byTopic: Map<string, AptitudeQuestion[]>; uncategorized: AptitudeQuestion[] }>();
    for (const c of CATEGORIES) result.set(c, { byTopic: new Map(), uncategorized: [] });
    for (const q of questions) {
      const bucket = result.get(q.category)!;
      if (q.topic_id) {
        const list = bucket.byTopic.get(q.topic_id) ?? [];
        list.push(q);
        bucket.byTopic.set(q.topic_id, list);
      } else {
        bucket.uncategorized.push(q);
      }
    }
    return result;
  }, [questions]);

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
      topic_id: q.topic_id ?? "",
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

  async function handleCreateTopic() {
    if (!newTopicName.trim()) return;
    setNewTopicError(null);
    setSavingNewTopic(true);
    try {
      const res = await fetch("/api/aptitude-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: form.category, name: newTopicName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTopics();
      setForm((f) => ({ ...f, topic_id: data.topic.id }));
      setNewTopicName("");
      setCreatingTopic(false);
    } catch (err: any) {
      setNewTopicError(err.message);
    } finally {
      setSavingNewTopic(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.topic_id) {
      setError("Pick a topic for this question (or create a new one).");
      return;
    }
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
      await Promise.all([load(), loadTopics()]);
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
    await loadTopics();
  }

  async function handleDeleteTopic(id: string, name: string) {
    if (!confirm(`Delete topic "${name}"? This only works while it has no questions.`)) return;
    const res = await fetch("/api/aptitude-topics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error);
      return;
    }
    await loadTopics();
  }

  function QuestionCard({ q }: { q: AptitudeQuestion }) {
    return (
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
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
    );
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
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as AptitudeCategory, topic_id: "" }))}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Topic</label>
            {creatingTopic ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className="input"
                  list="aptitude-topic-suggestions"
                  placeholder="New topic name"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTopic();
                    }
                  }}
                />
                {/* Suggestions only — a name not in this starting
                    taxonomy is still accepted as a new topic. */}
                <datalist id="aptitude-topic-suggestions">
                  {APTITUDE_TOPIC_SUGGESTIONS[form.category].map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={handleCreateTopic}
                  disabled={savingNewTopic || !newTopicName.trim()}
                  className="btn-secondary shrink-0 py-2.5 text-xs"
                >
                  {savingNewTopic ? "Saving..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingTopic(false);
                    setNewTopicName("");
                    setNewTopicError(null);
                  }}
                  className="shrink-0 text-xs text-fg-subtle hover:text-fg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <select
                className="input"
                value={form.topic_id}
                onChange={(e) => {
                  if (e.target.value === "__new__") {
                    setCreatingTopic(true);
                    return;
                  }
                  setForm((f) => ({ ...f, topic_id: e.target.value }));
                }}
              >
                <option value="">Select topic…</option>
                {topicsForFormCategory.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                <option value="__new__">+ Create new topic…</option>
              </select>
            )}
            {newTopicError && <p className="mt-1 text-xs text-red-400">{newTopicError}</p>}
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

      <div className="space-y-3">
        {loading && <p className="text-sm text-fg-muted">Loading…</p>}
        {!loading && questions.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">
            No questions yet — add one above.
          </p>
        )}
        {!loading && CATEGORIES.map((category) => {
          const bucket = groupsByCategory.get(category)!;
          const categoryTopics = topics.filter((t) => t.category === category);
          const total = Array.from(bucket.byTopic.values()).reduce((s, l) => s + l.length, 0) + bucket.uncategorized.length;
          if (categoryTopics.length === 0 && total === 0) return null;
          return (
            <FolderSection key={category} label={CATEGORY_LABELS[category]} count={total} defaultOpen>
              {categoryTopics.map((t) => {
                const list = bucket.byTopic.get(t.id) ?? [];
                return (
                  <FolderSection
                    key={t.id}
                    label={t.name}
                    count={list.length}
                    depth={1}
                    actions={
                      <button
                        type="button"
                        onClick={() => handleDeleteTopic(t.id, t.name)}
                        className="text-xs text-fg-subtle hover:text-red-400"
                      >
                        Delete
                      </button>
                    }
                  >
                    {list.length === 0 && <p className="text-xs text-fg-subtle">No questions here yet.</p>}
                    {list.map((q) => (
                      <QuestionCard key={q.id} q={q} />
                    ))}
                  </FolderSection>
                );
              })}
              {bucket.uncategorized.length > 0 && (
                <FolderSection label="Uncategorized" count={bucket.uncategorized.length} variant="uncategorized" depth={1} defaultOpen>
                  {bucket.uncategorized.map((q) => (
                    <QuestionCard key={q.id} q={q} />
                  ))}
                </FolderSection>
              )}
            </FolderSection>
          );
        })}
      </div>
    </div>
  );
}
