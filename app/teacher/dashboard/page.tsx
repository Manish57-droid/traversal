"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Target, Percent } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import StatTile from "@/components/StatTile";
import ClassSummaryCharts from "@/components/analytics/ClassSummaryCharts";
import StudentTable from "@/components/analytics/StudentTable";
import StudentDrawer from "@/components/analytics/StudentDrawer";
import ClassAccessPanel from "@/components/analytics/ClassAccessPanel";
import ProctoredTestsPanel from "@/components/ProctoredTestsPanel";
import AptitudeTestsPanel from "@/components/AptitudeTestsPanel";
import DsaAssignmentsPanel from "@/components/DsaAssignmentsPanel";
import ClassMaterialsPanel from "@/components/ClassMaterialsPanel";
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

  const avgDsaCompletion = useMemo(
    () => (students.length ? Math.round(students.reduce((sum, s) => sum + s.dsa_completion_pct, 0) / students.length) : 0),
    [students]
  );
  const avgAptitudeAccuracy = useMemo(
    () => (students.length ? Math.round(students.reduce((sum, s) => sum + s.aptitude_accuracy_pct, 0) / students.length) : 0),
    [students]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Class progress</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Combined DSA and Aptitude performance for every student in a class.
          </p>
        </div>
        <form onSubmit={handleCreateClass} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px]">
            <label className="mb-1 block text-xs text-fg-muted" htmlFor="className">New class name</label>
            <input id="className" className="input py-2 text-sm" placeholder="e.g. CSE-3B" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
          </div>
          <button type="submit" className="btn-secondary py-2 text-sm">Create class</button>
        </form>
      </div>

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

      {authorization && <ClassMaterialsPanel classId={selectedClass} />}

      {loadingAnalytics && <p className="text-sm text-fg-muted">Loading analytics…</p>}

      {analyticsError && (
        <p className="card p-6 text-center text-sm text-warn">{analyticsError}</p>
      )}

      {!loadingAnalytics && summary && (
        <>
          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-fg-subtle">Overview</p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatTile icon={Users} label="Students" value={students.length} tint="accent" />
                <StatTile icon={Target} label="Avg. DSA completion" value={`${avgDsaCompletion}%`} tint="success" />
                <StatTile icon={Percent} label="Avg. Aptitude accuracy" value={`${avgAptitudeAccuracy}%`} tint="warn" />
              </div>
              <ClassSummaryCharts summary={summary} />
              <StudentTable students={students} onSelect={setSelectedStudentId} />
            </div>
          </div>

          {authorization && (
            <div className="space-y-4 border-t border-line/70 pt-6">
              <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">Manage this class</p>
              <DsaAssignmentsPanel classId={selectedClass} />
              <AptitudeTestsPanel classId={selectedClass} />
              <ProctoredTestsPanel classId={selectedClass} />
              <ClassAccessPanel
                classId={selectedClass}
                className={activeClass?.name ?? ""}
                authorization={authorization}
                currentUserId={currentUserId}
                onLeft={handleLeftClass}
                onDeleted={handleLeftClass}
              />
            </div>
          )}
        </>
      )}

      {selectedStudentId && selectedClass && (
        <StudentDrawer studentId={selectedStudentId} classId={selectedClass} onClose={() => setSelectedStudentId(null)} />
      )}
    </div>
  );
}
