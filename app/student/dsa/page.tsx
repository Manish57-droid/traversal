"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import QuestionRow from "@/components/QuestionRow";
import { DIFFICULTY_LABELS, FILTERABLE_DIFFICULTIES } from "@/lib/difficulty";
import type { Question, QuestionDifficulty, QuestionStatus } from "@/types";

interface ProgressJoinRow {
  question_id: string;
  status: QuestionStatus;
  questions: Question;
}

type StatusFilter = "" | "completed" | "not_completed";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function StudentDsaPage() {
  const [rows, setRows] = useState<ProgressJoinRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [difficultyFilter, setDifficultyFilter] = useState<"" | QuestionDifficulty>("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

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

  // Any filter/search change invalidates the current page.
  useEffect(() => {
    setPage(1);
  }, [difficultyFilter, companyFilter, topicFilter, statusFilter, search]);

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
  // up front, so no extra round trip is needed just to populate these.
  const availableCompanies = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      for (const c of r.questions.companies) map.set(c.id, c.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const availableTopics = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) {
      for (const t of r.questions.topics) map.set(t.id, t.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (difficultyFilter && r.questions.difficulty !== difficultyFilter) return false;
    if (companyFilter && !r.questions.companies.some((c) => c.id === companyFilter)) return false;
    if (topicFilter && !r.questions.topics.some((t) => t.id === topicFilter)) return false;
    if (statusFilter === "completed" && r.status !== "completed") return false;
    if (statusFilter === "not_completed" && r.status === "completed") return false;
    if (search.trim() && !r.questions.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  const filtersActive = Boolean(difficultyFilter || companyFilter || topicFilter || statusFilter || search.trim());

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
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
          <label className="mb-1 block text-xs text-fg-muted">Topic</label>
          <select className="input w-auto py-1.5 text-xs" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
            <option value="">All topics</option>
            {availableTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
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
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-fg-muted">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              className="input py-1.5 pl-8 text-xs"
              placeholder="Search problems…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading && <p className="text-sm text-fg-muted">Loading your sheet…</p>}

      {!loading && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
            <span>
              {filtered.length} problem{filtered.length === 1 ? "" : "s"}
              {filtersActive && ` (of ${rows.length})`}
            </span>
            <div className="flex items-center gap-2">
              <select
                className="input w-auto py-1 text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="card p-6 text-center text-sm text-fg-muted">
              {filtersActive ? "No questions match these filters." : "No questions in the bank yet."}
            </p>
          ) : (
            <div className="card overflow-x-auto p-2">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line/70 text-xs text-fg-subtle">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Company</th>
                    <th className="py-2 pr-3 font-medium">Question</th>
                    <th className="py-2 pr-3 font-medium">Frequency</th>
                    <th className="py-2 pr-3 font-medium">Topic</th>
                    <th className="py-2 pr-3 font-medium">Level</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => (
                    <QuestionRow
                      key={row.question_id}
                      index={(currentPage - 1) * pageSize + i + 1}
                      question={row.questions}
                      status={row.status}
                      companyFilter={companyFilter}
                      onStatusChange={(next) => handleStatusChange(row.question_id, next)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-center gap-3 text-xs text-fg-muted">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
