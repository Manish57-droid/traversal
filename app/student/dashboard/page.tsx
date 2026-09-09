"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProgressBar from "@/components/ProgressBar";
import type { QuestionStatus } from "@/types";

interface ProgressJoinRow {
  status: QuestionStatus;
  questions: { platform: string; topic: string | null };
}

export default function StudentDashboardPage() {
  const [rows, setRows] = useState<ProgressJoinRow[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d) => setRows(d.progress ?? []))
      .finally(() => setLoading(false));
  }, []);

  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const attempted = rows.filter((r) => r.status === "attempted").length;
  const pct = total ? (completed / total) * 100 : 0;

  const byTopic = rows.reduce<Record<string, { total: number; completed: number }>>((acc, r) => {
    const key = r.questions.topic || "Uncategorized";
    acc[key] ??= { total: 0, completed: 0 };
    acc[key].total += 1;
    if (r.status === "completed") acc[key].completed += 1;
    return acc;
  }, {});

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinMessage(null);
    const res = await fetch("/api/classes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join_code: joinCode }),
    });
    const data = await res.json();
    setJoinMessage(res.ok ? "Joined! Your teacher can now assign you questions." : data.error);
    if (res.ok) setJoinCode("");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-white sm:text-3xl">Your progress</h1>
          <p className="mt-1 text-sm text-slate-400">A quick look at how the sheet is filling up.</p>
        </div>
        <Link href="/student/dsa" className="btn-primary">Open DSA sheet</Link>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs text-slate-400">Completed</p>
            <p className="font-display text-3xl text-success">{completed}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-slate-400">Attempted</p>
            <p className="font-display text-3xl text-warn">{attempted}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-slate-400">Total on sheet</p>
            <p className="font-display text-3xl text-white">{total}</p>
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-slate-300">Overall completion</span>
          <span className="text-slate-400">{Math.round(pct)}%</span>
        </div>
        <ProgressBar value={pct} />
      </div>

      {Object.keys(byTopic).length > 0 && (
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-medium text-slate-300">By topic</h2>
          <div className="space-y-4">
            {Object.entries(byTopic).map(([topic, stats]) => (
              <div key={topic}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{topic}</span>
                  <span>{stats.completed}/{stats.total}</span>
                </div>
                <ProgressBar value={(stats.completed / stats.total) * 100} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card max-w-md p-5">
        <h2 className="mb-1 text-sm font-medium text-slate-300">Join a class</h2>
        <p className="mb-3 text-xs text-slate-400">
          Enter the code your teacher shared so they can assign you questions.
        </p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. a1b2c3"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="submit" className="btn-secondary">Join</button>
        </form>
        {joinMessage && <p className="mt-2 text-xs text-slate-400">{joinMessage}</p>}
      </div>
    </div>
  );
}
