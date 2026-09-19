"use client";

import { useEffect, useState } from "react";
import type { ClassAccessRequest, ClassCollaborator } from "@/types";

// Who else can manage this class, plus (for the owner/admin) pending
// requests to decide on. A plain collaborator sees the same
// collaborator list but no pending-requests section and a "Leave
// class" button instead of "Remove" on their own row.
export default function ClassAccessPanel({
  classId,
  className,
  authorization,
  currentUserId,
  onLeft,
  onDeleted,
}: {
  classId: string;
  className: string;
  authorization: "owner" | "collaborator" | "admin";
  currentUserId: string | null;
  onLeft: () => void;
  onDeleted: () => void;
}) {
  const [collaborators, setCollaborators] = useState<ClassCollaborator[]>([]);
  const [requests, setRequests] = useState<ClassAccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canDecide = authorization === "owner" || authorization === "admin";

  async function load() {
    setLoading(true);
    const calls: Promise<any>[] = [fetch(`/api/classes/${classId}/collaborators`).then((r) => r.json())];
    if (canDecide) calls.push(fetch(`/api/classes/${classId}/access-requests`).then((r) => r.json()));

    const [collabData, requestData] = await Promise.all(calls);
    setCollaborators(collabData.collaborators ?? []);
    setRequests(requestData?.requests ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, authorization]);

  async function handleApprove(requestId: string) {
    setBusyId(requestId);
    await fetch(`/api/classes/${classId}/access-requests/${requestId}/approve`, { method: "POST" });
    await load();
    setBusyId(null);
  }

  async function handleReject(requestId: string) {
    setBusyId(requestId);
    await fetch(`/api/classes/${classId}/access-requests/${requestId}/reject`, { method: "POST" });
    await load();
    setBusyId(null);
  }

  async function handleRemove(teacherId: string) {
    if (!confirm("Remove this collaborator's access to the class?")) return;
    setBusyId(teacherId);
    await fetch(`/api/classes/${classId}/collaborators/${teacherId}`, { method: "DELETE" });
    await load();
    setBusyId(null);
  }

  async function handleLeave() {
    if (!currentUserId) return;
    if (!confirm("Leave this class? You'll lose access until re-approved.")) return;
    await fetch(`/api/classes/${classId}/collaborators/${currentUserId}`, { method: "DELETE" });
    onLeft();
  }

  async function handleDeleteClass() {
    const typed = prompt(
      `This permanently deletes "${className}" — every student, assignment, and test result in it. This can't be undone.\n\nType the class name to confirm.`
    );
    if (typed === null) return;
    if (typed.trim() !== className) {
      alert("Class name didn't match — nothing was deleted.");
      return;
    }
    setDeleteError(null);
    setDeleting(true);
    const res = await fetch(`/api/classes/${classId}`, { method: "DELETE" });
    if (res.ok) {
      onDeleted();
    } else {
      const data = await res.json().catch(() => ({}));
      setDeleteError(data.error || "Failed to delete class.");
      setDeleting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="card space-y-6 p-5">
      <div>
        <p className="text-sm font-medium text-fg">Collaborators</p>
        <div className="mt-3 space-y-2">
          {collaborators.length === 0 && <p className="text-xs text-fg-subtle">No collaborators yet.</p>}
          {collaborators.map((c) => (
            <div key={c.teacher_id} className="flex items-center justify-between gap-3 rounded-lg border border-line/70 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{c.full_name || c.email}</p>
                <p className="truncate text-xs text-fg-muted">{c.email}</p>
              </div>
              {canDecide && (
                <button
                  onClick={() => handleRemove(c.teacher_id)}
                  disabled={busyId === c.teacher_id}
                  className="shrink-0 text-xs text-fg-subtle transition-colors hover:text-warn"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        {authorization === "collaborator" && (
          <button onClick={handleLeave} className="btn-secondary mt-3 py-1.5 text-xs">
            Leave class
          </button>
        )}
      </div>

      {canDecide && (
        <div>
          <p className="text-sm font-medium text-fg">
            Pending requests {requests.length > 0 && <span className="text-fg-muted">({requests.length})</span>}
          </p>
          <div className="mt-3 space-y-2">
            {requests.length === 0 && <p className="text-xs text-fg-subtle">No pending requests.</p>}
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-fg">{r.full_name || r.email}</p>
                  <p className="truncate text-xs text-fg-muted">{r.email}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => handleApprove(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-full border border-success/40 px-2.5 py-1 text-xs text-success transition-colors hover:bg-success/10"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(r.id)}
                    disabled={busyId === r.id}
                    className="rounded-full border border-line px-2.5 py-1 text-xs text-fg-muted transition-colors hover:text-fg"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(authorization === "owner" || authorization === "admin") && (
        <div className="rounded-lg border border-warn/30 p-4">
          <p className="text-sm font-medium text-warn">Danger zone</p>
          <p className="mt-1 text-xs text-fg-muted">
            Permanently delete this class, its students, and all of their assignments and results. This can't be undone.
          </p>
          <button
            onClick={handleDeleteClass}
            disabled={deleting}
            className="mt-3 rounded-lg border border-warn/50 px-3 py-1.5 text-xs text-warn transition-colors hover:bg-warn/10 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete class"}
          </button>
          {deleteError && <p className="mt-2 text-xs text-warn">{deleteError}</p>}
        </div>
      )}
    </div>
  );
}
