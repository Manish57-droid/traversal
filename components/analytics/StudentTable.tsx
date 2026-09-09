"use client";

import { useMemo, useState } from "react";
import type { StudentAnalyticsRow } from "@/types";

type SortKey = "name" | "dsa" | "aptitude" | "total";

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Student" },
  { key: "dsa", label: "DSA completion" },
  { key: "aptitude", label: "Aptitude accuracy" },
  { key: "total", label: "Total attempted" },
];

export default function StudentTable({
  students,
  onSelect,
}: {
  students: StudentAnalyticsRow[];
  onSelect: (studentId: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    const rows = [...students];
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = (a.full_name || a.email).localeCompare(b.full_name || b.email);
      else if (sortKey === "dsa") cmp = a.dsa_completion_pct - b.dsa_completion_pct;
      else if (sortKey === "aptitude") cmp = a.aptitude_accuracy_pct - b.aptitude_accuracy_pct;
      else cmp = a.total_attempted - b.total_attempted;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [students, sortKey, sortDir]);

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-line/70 text-xs uppercase tracking-wide text-fg-subtle">
          <tr>
            {COLUMNS.map((col) => (
              <th key={col.key} className="px-4 py-3 font-normal">
                <button type="button" onClick={() => toggleSort(col.key)} className="flex items-center gap-1 transition-colors hover:text-fg">
                  {col.label}
                  {sortKey === col.key && <span aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.student_id}
              onClick={() => onSelect(s.student_id)}
              className="cursor-pointer border-b border-line/40 transition-colors last:border-0 hover:bg-surface-2"
            >
              <td className="px-4 py-3 text-fg">{s.full_name || s.email}</td>
              <td className="px-4 py-3 text-fg-muted">{s.dsa_completion_pct}%</td>
              <td className="px-4 py-3 text-fg-muted">{s.aptitude_accuracy_pct}%</td>
              <td className="px-4 py-3 text-fg-muted">{s.total_attempted}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-fg-subtle">
                No students in this class yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
