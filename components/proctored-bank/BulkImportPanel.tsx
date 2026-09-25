"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import type { ProctoredSetWithCount, ProctoredSubjectWithCount } from "@/types";
import { parseBulkQuestions, type ParsedQuestion } from "@/lib/proctoredBulkParse";

interface ReviewRow extends ParsedQuestion {
  /** Per-question Subject/Sets override — off by default, so the bulk
   * target picker above applies to every row until a teacher opts one out. */
  overrideTarget: boolean;
  rowSubjectId: string;
  rowSetIds: string[];
}

const SAMPLE_PLACEHOLDER = `Paste questions here, e.g.:

Q1. What is the time complexity of binary search?
A) O(n)
B) O(log n)
C) O(n^2)
D) O(1)
Answer: B

2) Which keyword declares a constant in JavaScript?
1) var
2) let
3) const
4) static
Ans: 3`;

export default function BulkImportPanel({
  subjects,
  sets,
  onImported,
  onClose,
}: {
  subjects: ProctoredSubjectWithCount[];
  sets: ProctoredSetWithCount[];
  onImported: () => Promise<void>;
  onClose: () => void;
}) {
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [bulkSetIds, setBulkSetIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleBulkSet(setId: string) {
    setBulkSetIds((prev) => (prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]));
  }

  function handleParse() {
    const parsed = parseBulkQuestions(rawText);
    setRows(
      parsed.map((q) => ({
        ...q,
        overrideTarget: false,
        rowSubjectId: "",
        rowSetIds: [],
      }))
    );
    setError(null);
  }

  function updateRow(clientId: string, patch: Partial<ReviewRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)) : prev));
  }

  function removeRow(clientId: string) {
    setRows((prev) => (prev ? prev.filter((r) => r.clientId !== clientId) : prev));
  }

  function updateOption(clientId: string, index: number, value: string) {
    setRows((prev) =>
      prev
        ? prev.map((r) => (r.clientId === clientId ? { ...r, options: r.options.map((o, i) => (i === index ? value : o)) } : r))
        : prev
    );
  }

  function addOption(clientId: string) {
    setRows((prev) => (prev ? prev.map((r) => (r.clientId === clientId ? { ...r, options: [...r.options, ""] } : r)) : prev));
  }

  function removeOption(clientId: string, index: number) {
    setRows((prev) =>
      prev
        ? prev.map((r) =>
            r.clientId === clientId
              ? {
                  ...r,
                  options: r.options.filter((_, i) => i !== index),
                  correctOption:
                    r.correctOption === null ? null : r.correctOption >= index && r.correctOption > 0 ? r.correctOption - 1 : r.correctOption,
                }
              : r
          )
        : prev
    );
  }

  function resolvedSubjectId(row: ReviewRow): string {
    return row.overrideTarget ? row.rowSubjectId : bulkSubjectId;
  }

  function resolvedSetIds(row: ReviewRow): string[] {
    return row.overrideTarget ? row.rowSetIds : bulkSetIds;
  }

  const readyCount = rows?.filter(
    (r) => r.prompt.trim() && r.options.filter((o) => o.trim()).length >= 2 && r.correctOption !== null && resolvedSubjectId(r)
  ).length ?? 0;

  async function handleConfirm() {
    if (!rows) return;
    setError(null);

    const invalidIdx = rows.findIndex(
      (r) => !r.prompt.trim() || r.options.filter((o) => o.trim()).length < 2 || r.correctOption === null || !resolvedSubjectId(r)
    );
    if (invalidIdx >= 0) {
      setError(
        `Question ${invalidIdx + 1} isn't ready yet — every question needs a prompt, at least 2 options, a correct option selected, and a Subject.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = rows.map((r) => ({
        prompt: r.prompt.trim(),
        options: r.options.map((o) => o.trim()).filter(Boolean),
        correct_option: r.correctOption,
        subject_id: resolvedSubjectId(r),
        set_ids: resolvedSetIds(r),
      }));
      const res = await fetch("/api/proctored-questions/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await onImported();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-fg">Bulk Add from Paste</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Paste a block of questions — numbered ("Q1.", "1)", "1.") with options ("A)", "a.", "1)"-"4)") and an
            optional "Answer:" line. Nothing saves until you confirm below.
          </p>
        </div>
        <button type="button" onClick={onClose} className="shrink-0 text-fg-muted hover:text-fg" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
      </div>

      {!rows && (
        <>
          <textarea
            className="input min-h-[240px] font-mono text-xs"
            placeholder={SAMPLE_PLACEHOLDER}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
          />
          <button type="button" className="btn-primary" disabled={!rawText.trim()} onClick={handleParse}>
            Parse questions
          </button>
        </>
      )}

      {rows && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line/70 bg-surface-2 p-3">
            <p className="text-sm text-fg">
              <span className="font-medium">{rows.length}</span> question{rows.length === 1 ? "" : "s"} detected —{" "}
              <span className={readyCount === rows.length ? "text-success" : "text-warn"}>{readyCount} ready to import</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setRows(null);
                setError(null);
              }}
              className="text-xs text-fg-muted underline hover:text-fg"
            >
              Start over
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Apply to all — Subject</label>
              <select className="input" value={bulkSubjectId} onChange={(e) => setBulkSubjectId(e.target.value)}>
                <option value="">Select subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Apply to all — Sets (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {sets.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                      bulkSetIds.includes(s.id) ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-fg-muted"
                    }`}
                  >
                    <input type="checkbox" className="sr-only" checked={bulkSetIds.includes(s.id)} onChange={() => toggleBulkSet(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {rows.map((row, i) => (
              <ReviewCard
                key={row.clientId}
                index={i}
                row={row}
                subjects={subjects}
                sets={sets}
                onChange={(patch) => updateRow(row.clientId, patch)}
                onOptionChange={(idx, value) => updateOption(row.clientId, idx, value)}
                onAddOption={() => addOption(row.clientId)}
                onRemoveOption={(idx) => removeOption(row.clientId, idx)}
                onRemove={() => removeRow(row.clientId)}
              />
            ))}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button type="button" className="btn-primary" disabled={submitting || rows.length === 0} onClick={handleConfirm}>
              {submitting ? "Importing..." : `Confirm and add ${rows.length} question${rows.length === 1 ? "" : "s"}`}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  index,
  row,
  subjects,
  sets,
  onChange,
  onOptionChange,
  onAddOption,
  onRemoveOption,
  onRemove,
}: {
  index: number;
  row: ReviewRow;
  subjects: ProctoredSubjectWithCount[];
  sets: ProctoredSetWithCount[];
  onChange: (patch: Partial<ReviewRow>) => void;
  onOptionChange: (index: number, value: string) => void;
  onAddOption: () => void;
  onRemoveOption: (index: number) => void;
  onRemove: () => void;
}) {
  function toggleRowSet(setId: string) {
    onChange({ rowSetIds: row.rowSetIds.includes(setId) ? row.rowSetIds.filter((id) => id !== setId) : [...row.rowSetIds, setId] });
  }

  return (
    <div className={`rounded-lg border p-3 ${row.parseError ? "border-warn/50 bg-warn/5" : "border-line/70"}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-fg-subtle">Question {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-fg-subtle hover:text-red-400" aria-label="Remove this question">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {row.parseError && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p>Couldn't confidently parse this: {row.parseError}</p>
            <p className="mt-1 text-fg-subtle">Original text — fix the fields below or remove this card.</p>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[11px] text-fg-muted">{row.rawText}</pre>
          </div>
        </div>
      )}

      <div className="mt-2">
        <label className="mb-1 block text-xs text-fg-muted">Prompt</label>
        <textarea
          className="input min-h-[50px]"
          value={row.prompt}
          onChange={(e) => onChange({ prompt: e.target.value })}
        />
      </div>

      <div className="mt-2">
        <label className="mb-1 block text-xs text-fg-muted">Options — pick the correct one</label>
        <div className="space-y-1.5">
          {row.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${row.clientId}`}
                checked={row.correctOption === i}
                onChange={() => onChange({ correctOption: i })}
                className="shrink-0 accent-success"
              />
              <input className="input" value={opt} onChange={(e) => onOptionChange(i, e.target.value)} />
              {row.options.length > 2 && (
                <button type="button" onClick={() => onRemoveOption(i)} className="shrink-0 text-xs text-fg-subtle hover:text-red-400">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={onAddOption} className="mt-1.5 text-xs text-success hover:underline">
          + Add option
        </button>
        {row.correctOption === null && <p className="mt-1 text-xs text-warn">No correct option selected yet.</p>}
      </div>

      <div className="mt-2">
        <label className="flex items-center gap-2 text-xs text-fg-muted">
          <input
            type="checkbox"
            checked={row.overrideTarget}
            onChange={(e) => onChange({ overrideTarget: e.target.checked })}
          />
          Use a different Subject/Sets for this question
        </label>
        {row.overrideTarget && (
          <div className="mt-1.5 space-y-1.5">
            <select
              className="input"
              value={row.rowSubjectId}
              onChange={(e) => onChange({ rowSubjectId: e.target.value })}
            >
              <option value="">Select subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-1.5">
              {sets.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                    row.rowSetIds.includes(s.id) ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-fg-muted"
                  }`}
                >
                  <input type="checkbox" className="sr-only" checked={row.rowSetIds.includes(s.id)} onChange={() => toggleRowSet(s.id)} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
