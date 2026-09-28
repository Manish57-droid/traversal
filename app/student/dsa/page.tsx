"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import QuestionRow from "@/components/QuestionRow";
import { DIFFICULTY_LABELS, FILTERABLE_DIFFICULTIES } from "@/lib/difficulty";
import type { Question, QuestionDifficulty, QuestionStatus } from "@/types";

interface ProgressJoinRow {
  question_id: string;
  status: QuestionStatus;
  questions: Question;
}

type StatusFilter = "" | "completed" | "not_completed";

export default function StudentDsaPage() {
  const [rows, setRows] = useState<ProgressJoinRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [difficultyFilter, setDifficultyFilter] = useState<"" | QuestionDifficulty>("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

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

  // Derived from whatever's already loaded — the full bank is fetched
  // up front, so no extra round trip is needed just to populate this.
  const availableCompanies = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      for (const c of r.questions.companies) map.set(c.id, c.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (difficultyFilter && r.questions.difficulty !== difficultyFilter) return false;
    if (companyFilter && !r.questions.companies.some((c) => c.id === companyFilter)) return false;
    if (statusFilter === "completed" && r.status !== "completed") return false;
    if (statusFilter === "not_completed" && r.status === "completed") return false;
    if (search.trim() && !r.questions.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const filtersActive = Boolean(difficultyFilter || companyFilter || statusFilter || search.trim());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Your DSA sheet</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Every DSA question in the bank — solve it on the real platform, then come back and check it off.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
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
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Company</label>
          <select className="input w-auto py-1.5 text-xs" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">All companies</option>
            {availableCompanies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted">Status</label>
          <select className="input w-auto py-1.5 text-xs" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="not_completed">Not completed</option>
          </select>
        </div>
        <div className="relative min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-fg-muted">Search</label>
          <Search className="pointer-events-none absolute left-2.5 top-[calc(50%+8px)] h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            className="input py-1.5 pl-8 text-xs"
            placeholder="Search problems…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-fg-muted">Loading your sheet…</p>}
        {!loading && filtered.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">
            {filtersActive ? "No questions match these filters." : "No questions in the bank yet."}
          </p>
        )}
        {filtered.map((row) => (
          <QuestionRow
            key={row.question_id}
            question={row.questions}
            status={row.status}
            onStatusChange={(next) => handleStatusChange(row.question_id, next)}
          />
        ))}
      </div>
    </div>
  );
}
