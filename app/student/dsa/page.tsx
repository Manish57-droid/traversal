"use client";

import { useEffect, useState } from "react";
import QuestionRow from "@/components/QuestionRow";
import type { Question, QuestionStatus } from "@/types";

interface ProgressJoinRow {
  id: string;
  status: QuestionStatus;
  question_id: string;
  questions: Question;
}

export default function StudentDsaPage() {
  const [rows, setRows] = useState<ProgressJoinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | QuestionStatus>("all");

  async function loadProgress() {
    setLoading(true);
    const res = await fetch("/api/progress");
    const data = await res.json();
    setRows(data.progress ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadProgress();
  }, []);

  async function handleStatusChange(questionId: string, status: QuestionStatus) {
    setRows((prev) =>
      prev.map((r) => (r.question_id === questionId ? { ...r, status } : r))
    );
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_id: questionId, status }),
    });
  }

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Your DSA sheet</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Everything here was assigned by a teacher. Click through to solve it on the real
          platform, then come back and check it off.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "not_started", "attempted", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              filter === f
                ? "border-success/60 bg-success/10 text-success"
                : "border-line/70 text-fg-muted hover:border-line"
            }`}
          >
            {f === "all" ? "All" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-fg-muted">Loading your sheet…</p>}
        {!loading && filtered.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">
            Nothing here yet — once your teacher assigns a question set, it'll show up here. Make
            sure you've joined their class from your dashboard.
          </p>
        )}
        {filtered.map((row) => (
          <QuestionRow
            key={row.id}
            question={row.questions}
            status={row.status}
            onStatusChange={(next) => handleStatusChange(row.question_id, next)}
          />
        ))}
      </div>
    </div>
  );
}
