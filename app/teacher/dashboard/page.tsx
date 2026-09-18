"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import ClassSummaryCharts from "@/components/analytics/ClassSummaryCharts";
import StudentTable from "@/components/analytics/StudentTable";
import StudentDrawer from "@/components/analytics/StudentDrawer";
import ClassAccessPanel from "@/components/analytics/ClassAccessPanel";
import ProctoredTestsPanel from "@/components/ProctoredTestsPanel";
import AptitudeTestsPanel from "@/components/AptitudeTestsPanel";
import type { ClassAnalyticsSummary, StudentAnalyticsRow } from "@/types";

interface ClassRow {
  id: string;
  name: string;
  join_code: string;
}

type Authorization = "owner" | "collaborator" | "admin";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [newClassName, setNewClassName] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [summary, setSummary] = useState<ClassAnalyticsSummary | null>(null);
  const [students, setStudents] = useState<StudentAnalyticsRow[]>([]);
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  async function loadClasses() {
    const res = await fetch("/api/classes");
    const data = await res.json();
    const fetched: ClassRow[] = data.classes ?? [];
    setClasses(fetched);

    const requestedClassId = searchParams.get("classId");
    if (requestedClassId && fetched.some((c) => c.id === requestedClassId)) {
      setSelectedClass(requestedClassId);
    } else if (fetched.length && !selectedClass) {
      setSelectedClass(fetched[0].id);
    }
  }

  useEffect(() => {
    loadClasses().finally(() => setLoadingClasses(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setSummary(null);
      setStudents([]);
      setAuthorization(null);
      return;
    }
    setLoadingAnalytics(true);
    setAnalyticsError(null);
    fetch(`/api/teacher/analytics?classId=${selectedClass}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setAnalyticsError(d.error);
          setSummary(null);
          setStudents([]);
          setAuthorization(null);
          return;
        }
        setSummary(d.summary ?? null);
        setStudents(d.students ?? []);
        setAuthorization(d.authorization ?? null);
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

  function handleLeftClass() {
    setSelectedClass("");
    loadClasses();
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
          Create a class above, or <button onClick={() => router.push("/teacher/classes")} className="text-success hover:underline">browse existing classes</button> to request access to one.
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

      {analyticsError && (
        <p className="card p-6 text-center text-sm text-warn">{analyticsError}</p>
      )}

      {!loadingAnalytics && summary && (
        <>
          <ClassSummaryCharts summary={summary} />
          <StudentTable students={students} onSelect={setSelectedStudentId} />
          {authorization && (
            <>
              <AptitudeTestsPanel classId={selectedClass} />
              <ProctoredTestsPanel classId={selectedClass} />
              <ClassAccessPanel
                classId={selectedClass}
                authorization={authorization}
                currentUserId={currentUserId}
                onLeft={handleLeftClass}
              />
            </>
          )}
        </>
      )}

      {selectedStudentId && selectedClass && (
        <StudentDrawer studentId={selectedStudentId} classId={selectedClass} onClose={() => setSelectedStudentId(null)} />
      )}
    </div>
  );
}
