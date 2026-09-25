"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import type { ProctoredSetWithCount, ProctoredSubjectWithCount } from "@/types";
import SetQuestionsManager from "./SetQuestionsManager";

const EMPTY_SUBJECT_FORM = { name: "" };
const EMPTY_SET_FORM = { name: "" };

export default function SubjectSetManager({
  subjects,
  sets,
  onReload,
}: {
  subjects: ProctoredSubjectWithCount[];
  sets: ProctoredSetWithCount[];
  onReload: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);

  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT_FORM);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [savingSubject, setSavingSubject] = useState(false);

  const [setForm, setSetForm] = useState(EMPTY_SET_FORM);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setError, setSetError] = useState<string | null>(null);
  const [savingSet, setSavingSet] = useState(false);
  const [managingSetId, setManagingSetId] = useState<string | null>(null);

  function cancelSubjectEdit() {
    setEditingSubjectId(null);
    setSubjectForm(EMPTY_SUBJECT_FORM);
    setSubjectError(null);
  }

  async function handleSubjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubjectError(null);
    setSavingSubject(true);
    try {
      const res = await fetch("/api/proctored-subjects", {
        method: editingSubjectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSubjectId ? { id: editingSubjectId, ...subjectForm } : subjectForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cancelSubjectEdit();
      await onReload();
    } catch (err: any) {
      setSubjectError(err.message);
    } finally {
      setSavingSubject(false);
    }
  }

  async function handleSubjectDelete(id: string) {
    if (!confirm("Delete this subject? Its questions become uncategorized (they keep their Sets). This can't be undone.")) return;
    await fetch("/api/proctored-subjects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await onReload();
  }

  function cancelSetEdit() {
    setEditingSetId(null);
    setSetForm(EMPTY_SET_FORM);
    setSetError(null);
  }

  async function handleSetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSetError(null);
    setSavingSet(true);
    try {
      const payload = editingSetId ? { id: editingSetId, name: setForm.name } : { name: setForm.name };
      const res = await fetch("/api/proctored-sets", {
        method: editingSetId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cancelSetEdit();
      await onReload();
    } catch (err: any) {
      setSetError(err.message);
    } finally {
      setSavingSet(false);
    }
  }

  async function handleSetDelete(id: string) {
    if (!confirm("Delete this set? Its questions aren't deleted — they just lose this bundle membership. This can't be undone.")) return;
    await fetch("/api/proctored-sets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await onReload();
  }

  function downloadSet(setId: string) {
    window.open(`/api/proctored-questions/export?setId=${setId}`, "_blank");
  }

  function downloadSubject(subjectId: string) {
    window.open(`/api/proctored-questions/export?subjectId=${subjectId}`, "_blank");
  }

  return (
    <section className="card p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-sm font-medium text-fg">Subjects &amp; Sets</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} · {sets.length} set{sets.length === 1 ? "" : "s"} — Subjects
            categorize each question; Sets are independent exam bundles that can freely mix subjects.
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* ---------- Subjects ---------- */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-fg-muted">Subjects</h3>
            <form onSubmit={handleSubjectSubmit} className="flex flex-wrap items-end gap-2">
              {editingSubjectId && (
                <div className="flex w-full items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                  Editing a subject
                  <button type="button" onClick={cancelSubjectEdit} className="underline">Cancel</button>
                </div>
              )}
              <div className="min-w-[160px] flex-1">
                <input
                  className="input"
                  placeholder="e.g. Data Structures"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ name: e.target.value })}
                />
              </div>
              <button className="btn-secondary py-2.5 text-xs" disabled={savingSubject}>
                {savingSubject ? "Saving..." : editingSubjectId ? "Save" : "+ Add"}
              </button>
            </form>
            {subjectError && <p className="text-sm text-red-400">{subjectError}</p>}

            <div className="space-y-1.5">
              {subjects.length === 0 && (
                <p className="rounded-lg border border-line/70 p-3 text-center text-xs text-fg-muted">No subjects yet.</p>
              )}
              {subjects.map((subject) => (
                <div key={subject.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <span className="text-fg">
                    {subject.name} <span className="text-xs text-fg-subtle">({subject.question_count})</span>
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => downloadSubject(subject.id)}
                      disabled={subject.question_count === 0}
                      className="flex items-center gap-1 text-fg-muted hover:text-fg disabled:opacity-40"
                      title="Download every question tagged with this subject"
                    >
                      <Download className="h-3.5 w-3.5" /> Export
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubjectId(subject.id);
                        setSubjectForm({ name: subject.name });
                      }}
                      className="text-fg-muted hover:text-fg"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubjectDelete(subject.id)}
                      className="text-fg-subtle hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ---------- Sets ---------- */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-fg-muted">Sets</h3>
            <form onSubmit={handleSetSubmit} className="flex flex-wrap items-end gap-2">
              {editingSetId && (
                <div className="flex w-full items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                  Editing a set
                  <button type="button" onClick={cancelSetEdit} className="underline">Cancel</button>
                </div>
              )}
              <div className="min-w-[160px] flex-1">
                <input
                  className="input"
                  placeholder="e.g. Mock Test 1 (mixed)"
                  value={setForm.name}
                  onChange={(e) => setSetForm({ name: e.target.value })}
                />
              </div>
              <button className="btn-secondary py-2.5 text-xs" disabled={savingSet}>
                {savingSet ? "Saving..." : editingSetId ? "Save" : "+ Add"}
              </button>
            </form>
            {setError && <p className="text-sm text-red-400">{setError}</p>}

            <div className="space-y-1.5">
              {sets.length === 0 && (
                <p className="rounded-lg border border-line/70 p-3 text-center text-xs text-fg-muted">No sets yet.</p>
              )}
              {sets.map((set) => (
                <div key={set.id} className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-fg">
                      {set.name} <span className="text-xs text-fg-subtle">({set.question_count})</span>
                    </span>
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setManagingSetId((cur) => (cur === set.id ? null : set.id))}
                        className={managingSetId === set.id ? "text-accent" : "text-fg-muted hover:text-fg"}
                      >
                        {managingSetId === set.id ? "Close" : "Manage questions"}
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadSet(set.id)}
                        disabled={set.question_count === 0}
                        className="flex items-center gap-1 text-fg-muted hover:text-fg disabled:opacity-40"
                        title="Download this set's questions"
                      >
                        <Download className="h-3.5 w-3.5" /> Export
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSetId(set.id);
                          setSetForm({ name: set.name });
                        }}
                        className="text-fg-muted hover:text-fg"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetDelete(set.id)}
                        className="text-fg-subtle hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {managingSetId === set.id && (
                    <div className="mt-2">
                      <SetQuestionsManager
                        setId={set.id}
                        onClose={() => setManagingSetId(null)}
                        onSaved={onReload}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
