"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AppUser } from "@/types";

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(d.users ?? []));
  }, []);

  const counts = {
    student: users.filter((u) => u.role === "student").length,
    teacher: users.filter((u) => u.role === "teacher").length,
    admin: users.filter((u) => u.role === "admin").length,
  };
  const pending = users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-white sm:text-3xl">Overview</h1>
          <p className="mt-1 text-sm text-slate-400">Platform-wide numbers at a glance.</p>
        </div>
        <Link href="/admin/users" className="btn-secondary">Manage users</Link>
      </div>

      {pending > 0 && (
        <Link href="/admin/users" className="card block border-ember/40 p-4 text-sm text-ember hover:border-ember/70">
          {pending} account{pending === 1 ? "" : "s"} waiting for approval →
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs text-slate-400">Students</p>
          <p className="font-display text-3xl text-sky">{counts.student}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-400">Teachers</p>
          <p className="font-display text-3xl text-ember">{counts.teacher}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-400">Admins</p>
          <p className="font-display text-3xl text-lime-light">{counts.admin}</p>
        </div>
      </div>
    </div>
  );
}
