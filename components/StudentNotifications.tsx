"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, FileText, ShieldCheck, X } from "lucide-react";
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

// Pops up as a stack of toasts — fed by lib/notifications.ts fanning
// out a row per class member whenever a teacher uploads class material
// or creates a proctored test — instead of a permanent dashboard card,
// so it takes no space at all when there's nothing new. Only ever
// shows unread notifications; dismissing or opening one marks it read
// and it's gone (still in the DB, just no longer surfaced here).
export default function StudentNotifications() {
  const router = useRouter();
  const [unread, setUnread] = useState<StudentNotification[]>([]);

  useEffect(() => {
    fetch("/api/student/notifications")
      .then((r) => r.json())
      .then((data) => {
        const all: StudentNotification[] = data.notifications ?? [];
        setUnread(all.filter((n) => !n.read));
      });
  }, []);

  function markRead(id: string) {
    setUnread((prev) => prev.filter((n) => n.id !== id));
    fetch(`/api/student/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    }).catch(() => {});
  }

  function handleOpen(n: StudentNotification) {
    markRead(n.id);
    router.push(n.href);
  }

  if (unread.length === 0) return null;

  return (
    <div className="fixed right-5 top-20 z-50 flex w-72 flex-col gap-2 sm:w-80">
      {unread.map((n) => {
        const Icon = TYPE_ICON[n.type] ?? Bell;
        return (
          <div key={n.id} className="card flex items-start gap-3 border-accent/40 bg-accent/5 p-3 shadow-lg">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <button type="button" onClick={() => handleOpen(n)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm text-fg">{n.title}</p>
              <p className="mt-0.5 text-xs text-fg-subtle">{timeAgo(n.created_at)} · Click to open</p>
            </button>
            <button
              type="button"
              onClick={() => markRead(n.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-fg-subtle hover:text-fg"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
