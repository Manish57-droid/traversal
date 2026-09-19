"use client";

import { useEffect, useMemo, useState } from "react";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/platform";
import { DIFFICULTY_LABELS, FILTERABLE_DIFFICULTIES } from "@/lib/difficulty";
import FolderSection from "@/components/FolderSection";
import type { DsaTopicWithCount, Question, QuestionDifficulty } from "@/types";

type PlatformFilter = "" | "leetcode" | "hackerrank" | "codechef" | "others";

export default function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<DsaTopicWithCount[]>([]);

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState("unknown");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [creatingTopic, setCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [savingNewTopic, setSavingNewTopic] = useState(false);
  const [newTopicError, setNewTopicError] = useState<string | null>(null);

  const [showNeedsLinkOnly, setShowNeedsLinkOnly] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("");
  const [difficultyFilter, setDifficultyFilter] = useState<"" | QuestionDifficulty>("");
  const [curatingId, setCuratingId] = useState<string | null>(null);
  const [curationUrl, setCurationUrl] = useState("");
  const [curationError, setCurationError] = useState<string | null>(null);
  const [curating, setCurating] = useState(false);

  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveTopicId, setMoveTopicId] = useState("");
  const [moving, setMoving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  async function loadTopics() {
    const res = await fetch("/api/dsa-topics");
    const data = await res.json();
    setTopics(data.topics ?? []);
  }

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
    loadTopics();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformFilter, difficultyFilter]);

  const needsLinkCount = useMemo(() => questions.filter((q) => q.needs_link_curation).length, [questions]);
  const filtered = showNeedsLinkOnly ? questions.filter((q) => q.needs_link_curation) : questions;
  const filtersActive = Boolean(platformFilter || difficultyFilter);

  const groups = useMemo(() => {
    const byTopic = new Map<string, Question[]>();
    const uncategorized: Question[] = [];
    for (const q of filtered) {
      if (q.topic_id) {
        const list = byTopic.get(q.topic_id) ?? [];
        list.push(q);
        byTopic.set(q.topic_id, list);
      } else {
        uncategorized.push(q);
      }
    }
    return { byTopic, uncategorized };
  }, [filtered]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, topic_id: topicId || null, difficulty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrl("");
      setTitle("");
      setTopicId("");
      setDifficulty("unknown");
      await Promise.all([load(), loadTopics()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateTopic() {
    if (!newTopicName.trim()) return;
    setNewTopicError(null);
    setSavingNewTopic(true);
    try {
      const res = await fetch("/api/dsa-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTopicName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadTopics();
      setTopicId(data.topic.id);
      setNewTopicName("");
      setCreatingTopic(false);
    } catch (err: any) {
      setNewTopicError(err.message);
    } finally {
      setSavingNewTopic(false);
    }
  }

  async function handleDeleteTopic(id: string, name: string) {
    if (!confirm(`Delete topic "${name}"? Its questions become uncategorized rather than being deleted. This can't be undone.`)) return;
    await fetch("/api/dsa-topics", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await Promise.all([load(), loadTopics()]);
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

  function startMove(q: Question) {
    setMovingId(q.id);
    setMoveTopicId(q.topic_id ?? "");
    setMoveError(null);
  }

  async function handleMoveSave() {
    if (!movingId) return;
    setMoveError(null);
    setMoving(true);
    try {
      const res = await fetch("/api/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: movingId, topic_id: moveTopicId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMovingId(null);
      await Promise.all([load(), loadTopics()]);
    } catch (err: any) {
      setMoveError(err.message);
    } finally {
      setMoving(false);
    }
  }

  function QuestionCard({ q }: { q: Question }) {
    return (
      <div className="card flex flex-col gap-3 p-4">
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
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs">
            {q.needs_link_curation && curatingId !== q.id && (
              <button onClick={() => startCuration(q)} className="text-warn hover:underline">
                Add link
              </button>
            )}
            {movingId !== q.id && (
              <button onClick={() => startMove(q)} className="text-fg-muted hover:text-fg">
                Move
              </button>
            )}
          </div>
        </div>

        {movingId === q.id && (
          <div className="flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
            <select className="input flex-1" value={moveTopicId} onChange={(e) => setMoveTopicId(e.target.value)}>
              <option value="">Uncategorized</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button onClick={handleMoveSave} disabled={moving} className="btn-secondary py-1.5 text-xs">
              {moving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setMovingId(null)} className="text-xs text-fg-muted hover:text-fg">
              Cancel
            </button>
            {moveError && <p className="w-full text-xs text-red-400">{moveError}</p>}
          </div>
        )}

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
    );
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
          {creatingTopic ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                className="input"
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
              value={topicId}
              onChange={(e) => {
                if (e.target.value === "__new__") {
                  setCreatingTopic(true);
                  return;
                }
                setTopicId(e.target.value);
              }}
            >
              <option value="">Uncategorized</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              <option value="__new__">+ Create new topic…</option>
            </select>
          )}
          {newTopicError && <p className="mt-1 text-xs text-red-400">{newTopicError}</p>}
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
        {topics.map((t) => {
          const list = groups.byTopic.get(t.id) ?? [];
          if (filtersActive && list.length === 0) return null;
          return (
            <FolderSection
              key={t.id}
              label={t.name}
              count={list.length}
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

        {groups.uncategorized.length > 0 && (
          <FolderSection label="Uncategorized" count={groups.uncategorized.length} variant="uncategorized" defaultOpen>
            {groups.uncategorized.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </FolderSection>
        )}

        {filtered.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">Nothing here yet.</p>
        )}
      </div>
    </div>
  );
}
