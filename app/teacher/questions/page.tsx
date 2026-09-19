"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/platform";
import { DIFFICULTY_LABELS, FILTERABLE_DIFFICULTIES } from "@/lib/difficulty";
import type { Question, QuestionDifficulty } from "@/types";

type PlatformFilter = "" | "leetcode" | "hackerrank" | "codechef" | "others";

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("unknown");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showNeedsLinkOnly, setShowNeedsLinkOnly] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("");
  const [difficultyFilter, setDifficultyFilter] = useState<"" | QuestionDifficulty>("");
  const [curatingId, setCuratingId] = useState<string | null>(null);
  const [curationUrl, setCurationUrl] = useState("");
  const [curationError, setCurationError] = useState<string | null>(null);
  const [curating, setCurating] = useState(false);

  // Both filters are sent as query params to the API — filtering
  // happens server-side (not just on whatever's already loaded on this
  // page), so counts stay correct as the bank grows.
  async function load() {
    const params = new URLSearchParams();
    if (platformFilter) params.set("platform", platformFilter);
    if (difficultyFilter) params.set("difficulty", difficultyFilter);
    const res = await fetch(`/api/questions${params.toString() ? `?${params}` : ""}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter, difficultyFilter]);

  const needsLinkCount = useMemo(() => questions.filter((q) => q.needs_link_curation).length, [questions]);
  const filtered = showNeedsLinkOnly ? questions.filter((q) => q.needs_link_curation) : questions;

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

  function startCuration(q: Question) {
    setCuratingId(q.id);
    setCurationUrl("");
    setCurationError(null);
  }

  async function handleCurationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!curatingId) return;
    setCurationError(null);
    setCurating(true);
    try {
      const res = await fetch("/api/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: curatingId, url: curationUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCuratingId(null);
      await load();
    } catch (err: any) {
      setCurationError(err.message);
    } finally {
      setCurating(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Question bank</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Add links here so they're ready to assign to a class from the Assign page.
        </p>
      </div>

      <form onSubmit={handleAdd} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div className="lg:col-span-2">
          <label className="mb-1 block text-xs text-fg-muted">Question link</label>
          <input required type="url" className="input" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Topic</label>
          <input className="input" placeholder="Graphs" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Difficulty</label>
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

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Platform</label>
          <select
            className="input w-auto py-1.5 text-xs"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as PlatformFilter)}
          >
            <option value="">All platforms</option>
            <option value="leetcode">LeetCode</option>
            <option value="hackerrank">HackerRank</option>
            <option value="codechef">CodeChef</option>
            <option value="others">Others</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Difficulty</label>
          <select
            className="input w-auto py-1.5 text-xs"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value as "" | QuestionDifficulty)}
          >
            <option value="">All difficulties</option>
            {FILTERABLE_DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>
        </div>
      </div>

      {needsLinkCount > 0 && (
        <button
          onClick={() => setShowNeedsLinkOnly((v) => !v)}
          className={`card block w-full p-4 text-left text-sm transition-colors ${
            showNeedsLinkOnly ? "border-warn/60 text-warn" : "border-warn/40 text-warn hover:border-warn/70"
          }`}
        >
          {needsLinkCount} question{needsLinkCount === 1 ? "" : "s"} still need a real link
          {showNeedsLinkOnly ? " — showing only these →" : " — click to filter →"}
        </button>
      )}

      <div className="space-y-3">
        {filtered.map((q) => (
          <div key={q.id} className="card flex flex-col gap-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <span
                  className="mr-2 rounded px-2 py-0.5 text-xs font-medium text-ink-fixed"
                  style={{ backgroundColor: PLATFORM_COLORS[q.platform] }}
                >
                  {PLATFORM_LABELS[q.platform]}
                </span>
                {q.url ? (
                  <a href={q.url} target="_blank" rel="noopener noreferrer" className="font-medium text-fg hover:text-success hover:underline">
                    {q.title}
                  </a>
                ) : (
                  <span className="font-medium text-fg-muted">{q.title}</span>
                )}
                {q.topic && <span className="ml-2 text-xs text-fg-muted">· {q.topic}</span>}
              </div>
              {q.needs_link_curation && curatingId !== q.id && (
                <button onClick={() => startCuration(q)} className="shrink-0 text-xs text-warn hover:underline">
                  Add link
                </button>
              )}
            </div>

            {curatingId === q.id && (
              <form onSubmit={handleCurationSubmit} className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
                <input
                  required
                  type="url"
                  autoFocus
                  className="input flex-1"
                  placeholder="https://leetcode.com/problems/..."
                  value={curationUrl}
                  onChange={(e) => setCurationUrl(e.target.value)}
                />
                <button className="btn-secondary py-1.5 text-xs" disabled={curating}>
                  {curating ? "Saving..." : "Save link"}
                </button>
                <button type="button" onClick={() => setCuratingId(null)} className="text-xs text-fg-muted hover:text-fg">
                  Cancel
                </button>
                {curationError && <p className="w-full text-xs text-red-400">{curationError}</p>}
              </form>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">Nothing here yet.</p>
        )}
      </div>
    </div>
  );
}
