"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import type { ProctoredSubjectWithSets } from "@/types";

const EMPTY_SUBJECT_FORM = { name: "" };
const EMPTY_SET_FORM = { name: "" };

export default function SubjectSetManager({
  subjects,
  onReload,
}: {
  subjects: ProctoredSubjectWithSets[];
  onReload: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT_FORM);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState<string | null>(null);
  const [savingSubject, setSavingSubject] = useState(false);

  const [setForm, setSetForm] = useState(EMPTY_SET_FORM);
  const [setFormSubjectId, setSetFormSubjectId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setError, setSetError] = useState<string | null>(null);
  const [savingSet, setSavingSet] = useState(false);

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
    if (!confirm("Delete this subject? All its sets go with it, and their questions become uncategorized. This can't be undone.")) return;
    await fetch("/api/proctored-subjects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (expandedSubjectId === id) setExpandedSubjectId(null);
    await onReload();
  }

  function cancelSetEdit() {
    setEditingSetId(null);
    setSetForm(EMPTY_SET_FORM);
    setSetError(null);
    setSetFormSubjectId(null);
  }

  async function handleSetSubmit(e: React.FormEvent, subjectId: string) {
    e.preventDefault();
    setSetError(null);
    setSavingSet(true);
    try {
      const payload = editingSetId ? { id: editingSetId, name: setForm.name } : { subject_id: subjectId, name: setForm.name };
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
    if (!confirm("Delete this set? Its questions become uncategorized rather than being deleted. This can't be undone.")) return;
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
            {subjects.length} subject{subjects.length === 1 ? "" : "s"} — organize the bank before adding questions.
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          <form onSubmit={handleSubjectSubmit} className="flex flex-wrap items-end gap-2">
            {editingSubjectId && (
              <div className="flex w-full items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                Editing a subject
                <button type="button" onClick={cancelSubjectEdit} className="underline">Cancel</button>
              </div>
            )}
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs text-fg-muted">New subject name</label>
              <input
                className="input"
                placeholder="e.g. Data Structures"
                value={subjectForm.name}
                onChange={(e) => setSubjectForm({ name: e.target.value })}
              />
            </div>
            <button className="btn-secondary py-2.5" disabled={savingSubject}>
              {savingSubject ? "Saving..." : editingSubjectId ? "Save changes" : "+ Add subject"}
            </button>
          </form>
          {subjectError && <p className="text-sm text-red-400">{subjectError}</p>}

          <div className="space-y-2">
            {subjects.length === 0 && (
              <p className="rounded-lg border border-line/70 p-4 text-center text-sm text-fg-muted">
                No subjects yet — add one above to start organizing the bank.
              </p>
            )}
            {subjects.map((subject) => {
              const isOpen = expandedSubjectId === subject.id;
              const totalQuestions = subject.sets.reduce((sum, s) => sum + s.question_count, 0);
              return (
                <div key={subject.id} className="rounded-lg border border-line/70">
                  <div className="flex items-center justify-between gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => setExpandedSubjectId(isOpen ? null : subject.id)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
                      <span className="font-medium text-fg">{subject.name}</span>
                      <span className="text-xs text-fg-subtle">
                        {subject.sets.length} set{subject.sets.length === 1 ? "" : "s"} · {totalQuestions} question{totalQuestions === 1 ? "" : "s"}
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => downloadSubject(subject.id)}
                        disabled={totalQuestions === 0}
                        className="flex items-center gap-1 text-fg-muted hover:text-fg disabled:opacity-40"
                        title="Download all questions in this subject"
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

                  {isOpen && (
                    <div className="space-y-2 border-t border-line/70 p-3">
                      <form
                        onSubmit={(e) => handleSetSubmit(e, subject.id)}
                        className="flex flex-wrap items-end gap-2"
                      >
                        {editingSetId && (
                          <div className="flex w-full items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
                            Editing a set
                            <button type="button" onClick={cancelSetEdit} className="underline">Cancel</button>
                          </div>
                        )}
                        <div className="min-w-[180px] flex-1">
                          <label className="mb-1 block text-xs text-fg-muted">New set name</label>
                          <input
                            className="input"
                            placeholder="e.g. Arrays & Strings"
                            value={setFormSubjectId === subject.id || editingSetId ? setForm.name : ""}
                            onChange={(e) => {
                              setSetFormSubjectId(subject.id);
                              setSetForm({ name: e.target.value });
                            }}
                          />
                        </div>
                        <button className="btn-secondary py-2.5 text-xs" disabled={savingSet}>
                          {savingSet ? "Saving..." : editingSetId ? "Save changes" : "+ Add set"}
                        </button>
                      </form>
                      {setError && <p className="text-sm text-red-400">{setError}</p>}

                      {subject.sets.length === 0 && (
                        <p className="text-xs text-fg-subtle">No sets yet — add one above.</p>
                      )}
                      <div className="space-y-1.5">
                        {subject.sets.map((set) => (
                          <div key={set.id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
                            <span className="text-fg">
                              {set.name} <span className="text-xs text-fg-subtle">({set.question_count})</span>
                            </span>
                            <div className="flex items-center gap-3 text-xs">
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
                                  setSetFormSubjectId(subject.id);
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
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
