"use client";

import { useEffect, useMemo, useState } from "react";
import type { RoleChangeLogRow } from "@/types";

export default function AdminRoleLogPage() {
  const [rows, setRows] = useState<RoleChangeLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    fetch("/api/admin/role-log")
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const result = term ? rows.filter((r) => r.target_name.toLowerCase().includes(term)) : rows;
    return [...result].sort((a, b) => {
      const cmp = new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, filter, sortDir]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Role log</h1>
        <p className="mt-1 text-sm text-fg-muted">Every role change, who made it, and when.</p>
      </div>

      <input
        className="input max-w-xs"
        placeholder="Filter by target user…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading && <p className="text-sm text-fg-muted">Loading…</p>}

      {!loading && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line/70 text-xs uppercase tracking-wide text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-normal">Target user</th>
                <th className="px-4 py-3 font-normal">Previous role</th>
                <th className="px-4 py-3 font-normal">New role</th>
                <th className="px-4 py-3 font-normal">Changed by</th>
                <th className="px-4 py-3 font-normal">
                  <button
                    type="button"
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    className="flex items-center gap-1 transition-colors hover:text-fg"
                  >
                    Timestamp
                    <span aria-hidden="true">{sortDir === "asc" ? "↑" : "↓"}</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line/40 last:border-0">
                  <td className="px-4 py-3 text-fg">{r.target_name}</td>
                  <td className="px-4 py-3 capitalize text-fg-muted">{r.previous_role}</td>
                  <td className="px-4 py-3 capitalize text-fg-muted">{r.new_role}</td>
                  <td className="px-4 py-3 text-fg-muted">{r.changed_by_name}</td>
                  <td className="px-4 py-3 text-fg-muted">{new Date(r.changed_at).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-fg-subtle">
                    No role changes recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
