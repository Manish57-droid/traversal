"use client";

import { useEffect, useState } from "react";
import type { AppUser, UserRole, UserStatus } from "@/types";

const ROLES: UserRole[] = ["student", "teacher", "admin"];

const STATUS_STYLE: Record<UserStatus, string> = {
  pending: "border-warn/40 text-warn",
  approved: "border-success/40 text-success",
  rejected: "border-red-500/40 text-red-400",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | UserStatus>("all");

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function patchUser(id: string, body: { role?: UserRole; status?: UserStatus }) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...body } : u)));
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
  }

  const filtered = users.filter((u) => filter === "all" || u.status === filter);
  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white sm:text-3xl">Users</h1>
        <p className="mt-1 text-sm text-slate-400">
          Approve new sign-ups and manage roles. {pendingCount > 0 && `${pendingCount} waiting on you.`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
              filter === f
                ? "border-success/60 bg-success/10 text-success"
                : "border-white/10 text-slate-400 hover:border-white/25"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Role</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-slate-200">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input w-auto py-1.5"
                      value={u.role}
                      onChange={(e) => patchUser(u.id, { role: e.target.value as UserRole })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[u.status]}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.status !== "approved" && (
                      <button
                        onClick={() => patchUser(u.id, { status: "approved" })}
                        className="mr-2 text-xs text-success hover:underline"
                      >
                        Approve
                      </button>
                    )}
                    {u.status !== "rejected" && (
                      <button
                        onClick={() => patchUser(u.id, { status: "rejected" })}
                        className="text-xs text-slate-500 hover:text-red-400"
                      >
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No users in this view.
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
