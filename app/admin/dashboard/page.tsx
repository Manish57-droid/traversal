"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AdminActivityItem, AdminOverviewStats } from "@/types";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [activity, setActivity] = useState<AdminActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? null);
        setActivity(d.recentActivity ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-fg-muted">Platform-wide numbers at a glance.</p>
      </div>

      {loading && <p className="text-sm text-fg-muted">Loading…</p>}

      {!loading && stats && (
        <>
          {(stats.pendingSignups > 0 || stats.pendingAccessRequests > 0) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stats.pendingSignups > 0 && (
                <Link href="/admin/users" className="card block border-warn/40 p-4 text-sm text-warn hover:border-warn/70">
                  {stats.pendingSignups} sign-up{stats.pendingSignups === 1 ? "" : "s"} waiting for approval →
                </Link>
              )}
              {stats.pendingAccessRequests > 0 && (
                <Link
                  href="/admin/access-requests"
                  className="card block border-warn/40 p-4 text-sm text-warn hover:border-warn/70"
                >
                  {stats.pendingAccessRequests} class access request{stats.pendingAccessRequests === 1 ? "" : "s"} waiting →
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="card p-5">
              <p className="text-xs text-fg-muted">Teachers</p>
              <p className="font-display text-3xl text-warn">{stats.teacherCount}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-fg-muted">Students</p>
              <p className="font-display text-3xl text-success">{stats.studentCount}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-fg-muted">Classes</p>
              <p className="font-display text-3xl text-accent">{stats.classCount}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-fg-muted">Pending sign-ups</p>
              <p className="font-display text-3xl text-fg">{stats.pendingSignups}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs text-fg-muted">Pending access requests</p>
              <p className="font-display text-3xl text-fg">{stats.pendingAccessRequests}</p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-fg">Recent activity</h2>
            <div className="card divide-y divide-line/40">
              {activity.length === 0 && <p className="p-5 text-sm text-fg-subtle">Nothing yet.</p>}
              {activity.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <span className="text-fg">{item.description}</span>
                  <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(item.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
