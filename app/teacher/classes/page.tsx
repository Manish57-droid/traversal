"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import type { ClassBrowseRow } from "@/types";

const RELATIONSHIP_LABEL: Record<string, string> = {
  owner: "Owner",
  collaborator: "Collaborator",
  admin: "Admin access",
  pending: "Request pending",
  none: "",
};

const RELATIONSHIP_STYLE: Record<string, string> = {
  owner: "border-success/40 text-success",
  collaborator: "border-accent/40 text-accent",
  admin: "border-accent/40 text-accent",
  pending: "border-warn/40 text-warn",
  none: "border-line text-fg-subtle",
};

export default function BrowseClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassBrowseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Surfaces a failed response instead of silently falling back to an
  // empty list — a `?? []` fallback here previously hid a real 500
  // (an ambiguous PostgREST embed) as "no classes exist yet," which is
  // exactly why the bug went unnoticed.
  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/classes/browse");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to load classes.");
      setClasses([]);
    } else {
      setClasses(data.classes ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRequestAccess(classId: string) {
    setRequesting(classId);
    const res = await fetch(`/api/classes/${classId}/access-requests`, { method: "POST" });
    if (res.ok) await load();
    setRequesting(null);
  }

  async function handleLeave(classId: string) {
    if (!currentUserId) return;
    if (!confirm("Leave this class? You'll lose access until re-approved.")) return;
    setLeaving(classId);
    await fetch(`/api/classes/${classId}/collaborators/${currentUserId}`, { method: "DELETE" });
    await load();
    setLeaving(null);
  }

  const hasAccess = (rel: string) => rel === "owner" || rel === "collaborator" || rel === "admin";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Browse classes</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Every class in Traversal. Request access to co-teach one you don't already manage —
          the owner (or an admin) decides.
        </p>
      </div>

      {loading && <p className="text-sm text-fg-muted">Loading…</p>}
      {error && <p className="card p-6 text-center text-sm text-warn">{error}</p>}

      {!loading && !error && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line/70 text-xs uppercase tracking-wide text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-normal">Class</th>
                <th className="px-4 py-3 font-normal">Owner</th>
                <th className="px-4 py-3 font-normal">Students</th>
                <th className="px-4 py-3 font-normal">Your access</th>
                <th className="px-4 py-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr
                  key={c.id}
                  className={`border-b border-line/40 last:border-0 ${
                    hasAccess(c.relationship) ? "cursor-pointer hover:bg-surface-2" : ""
                  }`}
                  onClick={() => hasAccess(c.relationship) && router.push(`/teacher/dashboard?classId=${c.id}`)}
                >
                  <td className="px-4 py-3 text-fg">{c.name}</td>
                  <td className="px-4 py-3 text-fg-muted">{c.owner_name}</td>
                  <td className="px-4 py-3 text-fg-muted">{c.student_count}</td>
                  <td className="px-4 py-3">
                    {c.relationship !== "none" && (
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${RELATIONSHIP_STYLE[c.relationship]}`}>
                        {RELATIONSHIP_LABEL[c.relationship]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.relationship === "none" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestAccess(c.id);
                        }}
                        disabled={requesting === c.id}
                        className="btn-secondary py-1.5 text-xs"
                      >
                        {requesting === c.id ? "Requesting..." : "Request access"}
                      </button>
                    )}
                    {c.relationship === "collaborator" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLeave(c.id);
                        }}
                        disabled={leaving === c.id || !currentUserId}
                        className="btn-secondary py-1.5 text-xs"
                      >
                        {leaving === c.id ? "Leaving..." : "Leave"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {classes.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-fg-subtle">
                    No classes exist yet.
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
