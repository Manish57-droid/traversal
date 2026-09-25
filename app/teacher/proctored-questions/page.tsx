"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Download, ImagePlus, X } from "lucide-react";
import type { ProctoredQuestion, ProctoredSetWithCount, ProctoredSubjectWithCount } from "@/types";
import SubjectSetManager from "@/components/proctored-bank/SubjectSetManager";
import BulkImportPanel from "@/components/proctored-bank/BulkImportPanel";
import FolderSection from "@/components/FolderSection";

const DEFAULT_MIN_WORD_COUNT = 150;

const EMPTY_FORM = {
  question_type: "mcq" as "mcq" | "theory",
  prompt: "",
  options: ["", "", "", ""],
  correct_option: 0,
  min_word_count: DEFAULT_MIN_WORD_COUNT,
  max_marks: 5,
  explanation: "",
  difficulty: "unknown",
  image_url: "" as string | null,
  subject_id: "",
  set_ids: [] as string[],
};

export default function ProctoredQuestionsPage() {
  const [subjects, setSubjects] = useState<ProctoredSubjectWithCount[]>([]);
  const [sets, setSets] = useState<ProctoredSetWithCount[]>([]);
  const [questions, setQuestions] = useState<ProctoredQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showBulkImport, setShowBulkImport] = useState(false);

  const [creatingSet, setCreatingSet] = useState(false);
  const [newSetName, setNewSetName] = useState("");
  const [savingNewSet, setSavingNewSet] = useState(false);
  const [newSetError, setNewSetError] = useState<string | null>(null);

  // Filters for the list view — independent of each other now that a
  // Set isn't scoped to a Subject.
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterSetId, setFilterSetId] = useState("");
  const [showUncategorizedOnly, setShowUncategorizedOnly] = useState(false);

  async function loadSubjects() {
    const res = await fetch("/api/proctored-subjects");
    const data = await res.json();
    setSubjects(data.subjects ?? []);
  }

  async function loadSets() {
    const res = await fetch("/api/proctored-sets");
    const data = await res.json();
    setSets(data.sets ?? []);
  }

  async function loadQuestions() {
    setLoading(true);
    const params = new URLSearchParams();
    if (showUncategorizedOnly) {
      params.set("needsCategorization", "true");
    } else {
      if (filterSubjectId) params.set("subjectId", filterSubjectId);
      if (filterSetId) params.set("setId", filterSetId);
    }
    const res = await fetch(`/api/proctored-questions?${params.toString()}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadSubjects();
    loadSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSubjectId, filterSetId, showUncategorizedOnly]);

  const filtersActive = Boolean(filterSubjectId || filterSetId || showUncategorizedOnly);

  const questionGroups = useMemo(() => {
    const bySubject = new Map<string, ProctoredQuestion[]>();
    const uncategorized: ProctoredQuestion[] = [];
    for (const q of questions) {
      if (q.needs_categorization || !q.subject_id) {
        uncategorized.push(q);
        continue;
      }
      const list = bySubject.get(q.subject_id) ?? [];
      list.push(q);
      bySubject.set(q.subject_id, list);
    }
    return { bySubject, uncategorized };
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

  function toggleFormSet(setId: string) {
    setForm((f) => ({
      ...f,
      set_ids: f.set_ids.includes(setId) ? f.set_ids.filter((id) => id !== setId) : [...f.set_ids, setId],
    }));
  }

  function startEdit(q: ProctoredQuestion) {
    setEditingId(q.id);
    setForm({
      question_type: q.question_type,
      prompt: q.prompt,
      options: q.options && q.options.length ? q.options : ["", "", "", ""],
      correct_option: q.correct_option ?? 0,
      min_word_count: q.min_word_count ?? DEFAULT_MIN_WORD_COUNT,
      max_marks: q.max_marks ?? 5,
      explanation: q.explanation ?? "",
      difficulty: q.difficulty,
      image_url: q.image_url,
      subject_id: q.subject_id ?? "",
      set_ids: q.sets.map((s) => s.id),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/proctored-questions/upload-image", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm((f) => ({ ...f, image_url: data.url }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  async function handleCreateSet() {
    if (!newSetName.trim()) return;
    setNewSetError(null);
    setSavingNewSet(true);
    try {
      const res = await fetch("/api/proctored-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSetName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadSets();
      setForm((f) => ({ ...f, set_ids: [...f.set_ids, data.set.id] }));
      setNewSetName("");
      setCreatingSet(false);
    } catch (err: any) {
      setNewSetError(err.message);
    } finally {
      setSavingNewSet(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.subject_id) {
      setError("Pick a Subject for this question.");
      return;
    }
    setSubmitting(true);
    try {
      const payload =
        form.question_type === "mcq"
          ? { ...form, options: form.options.map((o) => o.trim()).filter(Boolean) }
          : { ...form, options: undefined, correct_option: undefined };
      const res = await fetch("/api/proctored-questions", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cancelEdit();
      await Promise.all([loadQuestions(), loadSubjects(), loadSets()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this question? This can't be undone.")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    await fetch("/api/proctored-questions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await Promise.all([loadSubjects(), loadSets()]);
  }

  async function handleReload() {
    await Promise.all([loadSubjects(), loadSets(), loadQuestions()]);
  }

  function QuestionCard({ q }: { q: ProctoredQuestion }) {
    return (
      <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {q.question_type === "theory" && (
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                Theory · {q.max_marks} mark{q.max_marks === 1 ? "" : "s"}
              </span>
            )}
            {q.needs_categorization && (
              <span className="flex items-center gap-1 rounded-full bg-warn/10 px-2 py-0.5 text-xs text-warn">
                <AlertTriangle className="h-3 w-3" /> Needs categorization
              </span>
            )}
            {q.difficulty !== "unknown" && (
              <span className="text-xs capitalize text-fg-muted">{q.difficulty}</span>
            )}
            {q.sets.map((s) => (
              <span key={s.id} className="rounded-full border border-line/70 px-2 py-0.5 text-xs text-fg-muted">
                {s.name}
              </span>
            ))}
          </div>
          {q.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.image_url} alt="" className="mt-1 max-h-40 rounded-lg border border-line/70 object-contain" />
          )}
          <p className="mt-1 font-medium text-fg">{q.prompt}</p>
          {q.question_type === "theory" ? (
            <p className="mt-2 text-xs text-fg-subtle">
              Expects a written answer of at least {q.min_word_count ?? 150} words — graded manually after submission.
            </p>
          ) : (
            <ul className="mt-2 space-y-0.5 text-xs text-fg-muted">
              {(q.options ?? []).map((opt, i) => (
                <li key={i} className={i === q.correct_option ? "text-success" : ""}>
                  {i === q.correct_option ? "✓ " : "· "}
                  {opt}
                </li>
              ))}
            </ul>
          )}
          {q.created_by_name && (
            <p className="mt-2 text-xs text-fg-subtle">Added by {q.created_by_name}</p>
          )}
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Proctored test question bank</h1>
          <p className="mt-1 text-sm text-fg-muted">
            MCQs organized by Subject, kept separate from Aptitude and DSA. Sets are optional exam bundles — mix
            questions from any Subjects into one, or keep it single-topic — build a proctored test from them on a
            class's page.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => setShowBulkImport((v) => !v)}>
          {showBulkImport ? "Close bulk import" : "Bulk Add from Paste"}
        </button>
      </div>

      <SubjectSetManager subjects={subjects} sets={sets} onReload={handleReload} />

      {showBulkImport && (
        <BulkImportPanel
          subjects={subjects}
          sets={sets}
          onImported={handleReload}
          onClose={() => setShowBulkImport(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="card space-y-4 p-4">
        {editingId && (
          <div className="flex items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
            Editing a question
            <button type="button" onClick={cancelEdit} className="underline">
              Cancel
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs text-fg-muted">Question type</label>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="radio"
                name="question_type"
                checked={form.question_type === "mcq"}
                onChange={() => setForm((f) => ({ ...f, question_type: "mcq" }))}
              />
              Multiple choice
            </label>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="radio"
                name="question_type"
                checked={form.question_type === "theory"}
                onChange={() => setForm((f) => ({ ...f, question_type: "theory" }))}
              />
              Theory (long answer)
            </label>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Subject</label>
            <select
              className="input"
              value={form.subject_id}
              onChange={(e) => setForm((f) => ({ ...f, subject_id: e.target.value }))}
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {!subjects.length && <p className="mt-1 text-xs text-fg-subtle">Add a Subject below first.</p>}
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
          <label className="mb-1 block text-xs text-fg-muted">Sets (optional — this question can be in several, or none)</label>
          <div className="flex flex-wrap items-center gap-2">
            {sets.map((s) => (
              <label
                key={s.id}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${
                  form.set_ids.includes(s.id) ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-fg-muted"
                }`}
              >
                <input type="checkbox" className="sr-only" checked={form.set_ids.includes(s.id)} onChange={() => toggleFormSet(s.id)} />
                {s.name}
              </label>
            ))}
            {creatingSet ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  className="input py-1.5 text-xs"
                  placeholder="New set name"
                  value={newSetName}
                  onChange={(e) => setNewSetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateSet();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateSet}
                  disabled={savingNewSet || !newSetName.trim()}
                  className="btn-secondary shrink-0 py-1.5 text-xs"
                >
                  {savingNewSet ? "Saving..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreatingSet(false);
                    setNewSetName("");
                    setNewSetError(null);
                  }}
                  className="shrink-0 text-xs text-fg-subtle hover:text-fg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setCreatingSet(true)} className="text-xs text-success hover:underline">
                + Create new set…
              </button>
            )}
          </div>
          {newSetError && <p className="mt-1 text-xs text-red-400">{newSetError}</p>}
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted">Image (optional)</label>
          {form.image_url ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="" className="max-h-40 rounded-lg border border-line/70 object-contain" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                aria-label="Remove image"
                className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-bg text-fg-muted hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelected}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {uploadingImage ? "Uploading..." : "Add Image"}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted">Prompt</label>
          <textarea
            className="input min-h-[80px]"
            placeholder="What is the time complexity of binary search?"
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
          />
        </div>

        {form.question_type === "mcq" ? (
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
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Minimum word count (guideline shown to the student)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={form.min_word_count}
                onChange={(e) => setForm((f) => ({ ...f, min_word_count: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Marks for a full-credit answer</label>
              <input
                type="number"
                min={1}
                step="0.5"
                className="input"
                value={form.max_marks}
                onChange={(e) => setForm((f) => ({ ...f, max_marks: Number(e.target.value) }))}
              />
            </div>
            <p className="text-xs text-fg-subtle sm:col-span-2">
              Theory answers aren't auto-graded — you'll award marks (up to this max) per answer after the test is
              submitted.
            </p>
          </div>
        )}

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

      {/* ---------- Filters ---------- */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs text-fg-muted">Filter by Subject</label>
          <select
            className="input"
            value={filterSubjectId}
            onChange={(e) => {
              setFilterSubjectId(e.target.value);
              setShowUncategorizedOnly(false);
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className="mb-1 block text-xs text-fg-muted">Filter by Set</label>
          <select
            className="input"
            value={filterSetId}
            onChange={(e) => {
              setFilterSetId(e.target.value);
              setShowUncategorizedOnly(false);
            }}
          >
            <option value="">All sets</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {filterSetId && (
          <a
            href={`/api/proctored-questions/export?setId=${filterSetId}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary flex items-center gap-1.5 py-2.5 text-xs"
          >
            <Download className="h-3.5 w-3.5" /> Download this set
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            setShowUncategorizedOnly((v) => !v);
            setFilterSubjectId("");
            setFilterSetId("");
          }}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs transition-colors ${
            showUncategorizedOnly ? "border-warn/50 bg-warn/10 text-warn" : "border-line text-fg-muted hover:text-fg"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Needs categorization only
        </button>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-fg-muted">Loading…</p>}
        {!loading && questions.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">
            No questions match these filters.
          </p>
        )}
        {!loading && subjects.map((subject) => {
          const list = questionGroups.bySubject.get(subject.id) ?? [];
          if (filtersActive && list.length === 0) return null;
          return (
            <FolderSection key={subject.id} label={subject.name} count={list.length} defaultOpen>
              {list.length === 0 && <p className="text-xs text-fg-subtle">No questions here yet.</p>}
              {list.map((q) => (
                <QuestionCard key={q.id} q={q} />
              ))}
            </FolderSection>
          );
        })}

        {!loading && questionGroups.uncategorized.length > 0 && (
          <FolderSection label="Uncategorized" count={questionGroups.uncategorized.length} variant="uncategorized" defaultOpen>
            {questionGroups.uncategorized.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </FolderSection>
        )}
      </div>
    </div>
  );
}
