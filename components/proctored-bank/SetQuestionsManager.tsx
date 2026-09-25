"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ProctoredQuestion } from "@/types";

// Inline panel for picking which existing bank questions belong to
// one Set — the counterpart to the per-question Set checkboxes on the
// question form, but from the Set's side, so a teacher can populate a
// freshly created Set from questions that already exist rather than
// editing them one at a time.
export default function SetQuestionsManager({
  setId,
  onClose,
  onSaved,
}: {
  setId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [questions, setQuestions] = useState<ProctoredQuestion[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/proctored-questions")
      .then((r) => r.json())
      .then((data) => {
        const all = (data.questions ?? []) as ProctoredQuestion[];
        setQuestions(all);
        setSelected(new Set(all.filter((q) => q.sets.some((s) => s.id === setId)).map((q) => q.id)));
      })
      .catch((err) => setError(err.message));
  }, [setId]);

  const subjects = useMemo(() => {
    if (!questions) return [];
    const map = new Map<string, string>();
    for (const q of questions) {
      if (q.subject_id && q.subject_name) map.set(q.subject_id, q.subject_name);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [questions]);

  const filtered = useMemo(() => {
    if (!questions) return [];
    return questions.filter((q) => {
      if (subjectFilter && q.subject_id !== subjectFilter) return false;
      if (search.trim() && !q.prompt.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [questions, subjectFilter, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/proctored-sets/${setId}/questions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question_ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-line/70 bg-surface-2/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg">
          Pick which questions belong to this set — {selected.size} selected
        </p>
        <div className="flex gap-2 text-xs">
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary py-1 text-xs">
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary py-1 text-xs">
            Cancel
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {questions === null ? (
        <p className="text-xs text-fg-subtle">Loading questions…</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
              <input
                className="input py-1.5 pl-8 text-xs"
                placeholder="Search prompts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="input py-1.5 text-xs" value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.length === 0 && <p className="text-xs text-fg-subtle">No questions match.</p>}
            {filtered.map((q) => (
              <label
                key={q.id}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={selected.has(q.id)}
                  onChange={() => toggle(q.id)}
                />
                <span className="min-w-0">
                  <span className="block truncate text-fg">{q.prompt}</span>
                  <span className="text-xs text-fg-subtle">{q.subject_name ?? "Uncategorized"}</span>
                </span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
