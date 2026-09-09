"use client";

import { useEffect, useState } from "react";
import type { AdminClassAccessRequest } from "@/types";

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AdminClassAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/access-requests");
    const data = await res.json();
    setRequests(data.requests ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApprove(r: AdminClassAccessRequest) {
    setBusyId(r.id);
    await fetch(`/api/classes/${r.class_id}/access-requests/${r.id}/approve`, { method: "POST" });
    await load();
    setBusyId(null);
  }

  async function handleReject(r: AdminClassAccessRequest) {
    setBusyId(r.id);
    await fetch(`/api/classes/${r.class_id}/access-requests/${r.id}/reject`, { method: "POST" });
    await load();
    setBusyId(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Class access requests</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Every pending request to co-teach a class, across every class in the system.
        </p>
      </div>

      {loading && <p className="text-sm text-fg-muted">Loading…</p>}

      {!loading && requests.length === 0 && (
        <p className="card p-6 text-center text-sm text-fg-muted">No pending requests.</p>
      )}

      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm text-fg">
                <span className="font-medium">{r.full_name || r.email}</span> wants access to{" "}
                <span className="font-medium">{r.class_name}</span>
              </p>
              <p className="text-xs text-fg-muted">{r.email}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => handleApprove(r)}
                disabled={busyId === r.id}
                className="rounded-full border border-success/40 px-3 py-1.5 text-xs text-success transition-colors hover:bg-success/10"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(r)}
                disabled={busyId === r.id}
                className="rounded-full border border-line px-3 py-1.5 text-xs text-fg-muted transition-colors hover:text-fg"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
