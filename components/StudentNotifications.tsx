"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, FileText, ShieldCheck } from "lucide-react";
import type { StudentNotification } from "@/types";

const TYPE_ICON: Record<StudentNotification["type"], typeof FileText> = {
  class_material: FileText,
  proctored_test: ShieldCheck,
};

function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// The student dashboard's notification feed — fed by
// lib/notifications.ts fanning out a row per class member whenever a
// teacher uploads class material or creates a proctored test.
// Deliberately card-on-the-dashboard rather than a navbar dropdown, to
// match where this was asked for.
export default function StudentNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/student/notifications");
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unread_count ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleOpen(n: StudentNotification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/student/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      }).catch(() => {});
    }
    router.push(n.href);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/student/notifications/read-all", { method: "POST" });
  }

  if (loading) return null;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-medium text-fg">Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-ink-fixed">{unreadCount}</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <BellOff className="h-6 w-6 text-fg-subtle" />
          <p className="text-sm text-fg-subtle">Nothing yet — new materials and tests from your teachers show up here.</p>
        </div>
      )}

      <div className="space-y-1.5">
        {notifications.map((n) => {
          const Icon = TYPE_ICON[n.type] ?? Bell;
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => handleOpen(n)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                n.read
                  ? "border-line/70 text-fg-muted hover:border-line"
                  : "border-accent/40 bg-accent/5 text-fg hover:border-accent/60"
              }`}
            >
              {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
              <Icon className={`h-4 w-4 shrink-0 ${n.read ? "text-fg-subtle" : "text-accent"}`} />
              <span className="min-w-0 flex-1 truncate">{n.title}</span>
              <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(n.created_at)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
