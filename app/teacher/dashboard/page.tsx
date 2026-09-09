"use client";

import { useEffect, useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import type { StudentProgressSummary } from "@/types";

interface ClassRow {
  id: string;
  name: string;
  join_code: string;
}

export default function TeacherDashboardPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [summaries, setSummaries] = useState<StudentProgressSummary[]>([]);
  const [newClassName, setNewClassName] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadClasses() {
    const res = await fetch("/api/classes");
    const data = await res.json();
    setClasses(data.classes ?? []);
    if (data.classes?.length && !selectedClass) setSelectedClass(data.classes[0].id);
  }

  useEffect(() => {
    loadClasses().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const qs = selectedClass ? `?class_id=${selectedClass}` : "";
    fetch(`/api/teacher/progress${qs}`)
      .then((r) => r.json())
      .then((d) => setSummaries(d.summaries ?? []));
  }, [selectedClass]);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!newClassName.trim()) return;
    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClassName }),
    });
    if (res.ok) {
      setNewClassName("");
      await loadClasses();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-white sm:text-3xl">Class progress</h1>
        <p className="mt-1 text-sm text-slate-400">See how every student is moving through assigned questions.</p>
      </div>

      <form onSubmit={handleCreateClass} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs text-slate-400" htmlFor="className">New class name</label>
          <input id="className" className="input" placeholder="e.g. CSE-3B" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
        </div>
        <button type="submit" className="btn-secondary">Create class</button>
      </form>

      {!loading && classes.length === 0 && (
        <p className="card p-6 text-center text-sm text-slate-400">
          Create a class above, then share its join code with students.
        </p>
      )}

      {classes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="input w-auto"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {classes.find((c) => c.id === selectedClass) && (
            <span className="text-xs text-slate-400">
              Join code: <span className="font-mono text-success">{classes.find((c) => c.id === selectedClass)?.join_code}</span>
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        {summaries.length === 0 && classes.length > 0 && (
          <p className="card p-6 text-center text-sm text-slate-400">
            No students in this class yet — share the join code above.
          </p>
        )}
        {summaries.map((s) => {
          const pct = s.total_assigned ? (s.completed / s.total_assigned) * 100 : 0;
          return (
            <div key={s.student_id} className="card p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-100">{s.full_name || s.email}</p>
                  <p className="text-xs text-slate-400">
                    {s.completed} completed · {s.attempted} attempted · {s.not_started} not started
                  </p>
                </div>
                <span className="text-sm text-slate-400">{Math.round(pct)}%</span>
              </div>
              <ProgressBar value={pct} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
