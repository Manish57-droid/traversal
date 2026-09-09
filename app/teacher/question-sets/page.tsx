"use client";

import { useEffect, useState } from "react";
import { PLATFORM_LABELS } from "@/lib/platform";
import type { Question } from "@/types";

interface QuestionSetRow {
  id: string;
  name: string;
  description: string | null;
  question_set_items: { question_id: string; questions: Question }[];
}

export default function TeacherQuestionSetsPage() {
  const [sets, setSets] = useState<QuestionSetRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState("");

  async function load() {
    const [setsRes, questionsRes] = await Promise.all([
      fetch("/api/question-sets"),
      fetch("/api/questions"),
    ]);
    setSets((await setsRes.json()).question_sets ?? []);
    setQuestions((await questionsRes.json()).questions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleQuestion(id: string) {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await fetch("/api/question-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, question_ids: selectedQuestionIds }),
    });
    setName("");
    setDescription("");
    setSelectedQuestionIds([]);
    setSubmitting(false);
    await load();
  }

  async function handleAddExisting(setId: string) {
    if (!pendingQuestionId) return;
    await fetch(`/api/question-sets/${setId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: pendingQuestionId }),
    });
    setPendingQuestionId("");
    setAddingTo(null);
    await load();
  }

  async function handleRemove(setId: string, questionId: string) {
    await fetch(`/api/question-sets/${setId}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId }),
    });
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Question sets</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Group questions from the bank into a named set, then assign the whole thing on the Assign page.
        </p>
      </div>

      <form onSubmit={handleCreate} className="card space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Set name</label>
            <input className="input" placeholder="Week 3 - Arrays" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Description (optional)</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        {questions.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-fg-muted">Pick questions from the bank to include</p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {questions.map((q) => (
                <label key={q.id} className="flex items-center gap-2 rounded-lg border border-line/70 px-3 py-2 text-sm hover:border-line">
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                  />
                  <span className="text-fg">[{PLATFORM_LABELS[q.platform]}] {q.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Creating..." : "Create set"}
        </button>
      </form>

      <div className="space-y-4">
        {sets.map((s) => (
          <div key={s.id} className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-fg">{s.name}</p>
                {s.description && <p className="text-xs text-fg-muted">{s.description}</p>}
              </div>
              <button
                onClick={() => setAddingTo(addingTo === s.id ? null : s.id)}
                className="btn-secondary py-1.5 text-xs"
              >
                Add question
              </button>
            </div>

            {addingTo === s.id && (
              <div className="mb-3 flex gap-2">
                <select className="input" value={pendingQuestionId} onChange={(e) => setPendingQuestionId(e.target.value)}>
                  <option value="">Select from bank…</option>
                  {questions
                    .filter((q) => !s.question_set_items.some((it) => it.question_id === q.id))
                    .map((q) => (
                      <option key={q.id} value={q.id}>{q.title}</option>
                    ))}
                </select>
                <button onClick={() => handleAddExisting(s.id)} className="btn-secondary">Add</button>
              </div>
            )}

            <div className="space-y-2">
              {s.question_set_items.length === 0 && (
                <p className="text-xs text-fg-subtle">No questions in this set yet.</p>
              )}
              {s.question_set_items.map((it) => (
                <div key={it.question_id} className="flex items-center justify-between rounded-lg border border-line/70 px-3 py-2 text-sm">
                  <span className="text-fg">
                    [{PLATFORM_LABELS[it.questions.platform]}] {it.questions.title}
                  </span>
                  <button onClick={() => handleRemove(s.id, it.question_id)} className="text-xs text-fg-subtle hover:text-red-400">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
