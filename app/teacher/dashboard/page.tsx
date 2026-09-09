"use client";

import { useEffect, useState } from "react";
import ClassSummaryCharts from "@/components/analytics/ClassSummaryCharts";
import StudentTable from "@/components/analytics/StudentTable";
import StudentDrawer from "@/components/analytics/StudentDrawer";
import type { ClassAnalyticsSummary, StudentAnalyticsRow } from "@/types";

interface ClassRow {
  id: string;
  name: string;
  join_code: string;
}

export default function TeacherDashboardPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [newClassName, setNewClassName] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [summary, setSummary] = useState<ClassAnalyticsSummary | null>(null);
  const [students, setStudents] = useState<StudentAnalyticsRow[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  async function loadClasses() {
    const res = await fetch("/api/classes");
    const data = await res.json();
    setClasses(data.classes ?? []);
    if (data.classes?.length && !selectedClass) setSelectedClass(data.classes[0].id);
  }

  useEffect(() => {
    loadClasses().finally(() => setLoadingClasses(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setSummary(null);
      setStudents([]);
      return;
    }
    setLoadingAnalytics(true);
    fetch(`/api/teacher/analytics?classId=${selectedClass}`)
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary ?? null);
        setStudents(d.students ?? []);
      })
      .finally(() => setLoadingAnalytics(false));
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

  const activeClass = classes.find((c) => c.id === selectedClass);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Class progress</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Combined DSA and Aptitude performance for every student in a class.
        </p>
      </div>

      <form onSubmit={handleCreateClass} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="className">New class name</label>
          <input id="className" className="input" placeholder="e.g. CSE-3B" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
        </div>
        <button type="submit" className="btn-secondary">Create class</button>
      </form>

      {!loadingClasses && classes.length === 0 && (
        <p className="card p-6 text-center text-sm text-fg-muted">
          Create a class above, then share its join code with students.
        </p>
      )}

      {classes.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <select className="input w-auto" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {activeClass && (
            <span className="text-xs text-fg-muted">
              Join code: <span className="font-mono text-success">{activeClass.join_code}</span>
            </span>
          )}
        </div>
      )}

      {loadingAnalytics && <p className="text-sm text-fg-muted">Loading analytics…</p>}

      {!loadingAnalytics && summary && (
        <>
          <ClassSummaryCharts summary={summary} />
          <StudentTable students={students} onSelect={setSelectedStudentId} />
        </>
      )}

      {selectedStudentId && selectedClass && (
        <StudentDrawer studentId={selectedStudentId} classId={selectedClass} onClose={() => setSelectedStudentId(null)} />
      )}
    </div>
  );
}
