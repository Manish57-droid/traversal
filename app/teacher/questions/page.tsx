"use client";

import { useEffect, useState } from "react";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/platform";
import type { Question } from "@/types";

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("unknown");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const res = await fetch("/api/questions");
    const data = await res.json();
    setQuestions(data.questions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, topic, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrl("");
      setTitle("");
      setTopic("");
      setDifficulty("unknown");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-white sm:text-3xl">Question bank</h1>
        <p className="mt-1 text-sm text-slate-400">
          Add links here so they're ready to assign to a class from the Assign page.
        </p>
      </div>

      <form onSubmit={handleAdd} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs text-slate-400">Question link</label>
          <input required type="url" className="input" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Topic</label>
          <input className="input" placeholder="Graphs" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Difficulty</label>
          <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="unknown">Unspecified</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <button className="btn-primary lg:col-span-5" disabled={submitting}>
          {submitting ? "Adding..." : "Add to bank"}
        </button>
        {error && <p className="text-sm text-red-400 lg:col-span-5">{error}</p>}
      </form>

      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <span
                className="mr-2 rounded px-2 py-0.5 text-xs font-medium text-ink"
                style={{ backgroundColor: PLATFORM_COLORS[q.platform] }}
              >
                {PLATFORM_LABELS[q.platform]}
              </span>
              <a href={q.url} target="_blank" rel="noopener noreferrer" className="font-medium text-slate-100 hover:text-sky hover:underline">
                {q.title}
              </a>
              {q.topic && <span className="ml-2 text-xs text-slate-400">· {q.topic}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
