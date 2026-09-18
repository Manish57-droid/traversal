"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Download } from "lucide-react";

interface AssignmentRow {
  id: string;
  question_set_name: string;
  question_count: number;
  due_date: string | null;
}

interface StudentRollup {
  student_id: string;
  student_name: string;
  student_email: string;
  completed: number;
  attempted: number;
  not_started: number;
  completion_pct: number;
}

function AssignmentDetail({ assignmentId }: { assignmentId: string }) {
  const [students, setStudents] = useState<StudentRollup[] | null>(null);

  useEffect(() => {
    fetch(`/api/assign/${assignmentId}/rollup`)
      .then((r) => r.json())
      .then((d) => setStudents(d.students ?? []));
  }, [assignmentId]);

  return (
    <div className="space-y-4 border-t border-line/70 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-muted">Per-student completion for this assignment.</p>
        <a
          href={`/api/assign/${assignmentId}/report`}
          className="btn-secondary flex items-center gap-1.5 py-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" />
          Download Report
        </a>
      </div>

      {students === null && <p className="text-xs text-fg-subtle">Loading students…</p>}
      {students?.length === 0 && <p className="text-xs text-fg-subtle">No students in this class yet.</p>}

      {students && students.length > 0 && (
        <div className="space-y-2">
          {students.map((s) => (
            <div key={s.student_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/70 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{s.student_name}</p>
                <p className="text-xs text-fg-muted">
                  {s.completed} completed · {s.attempted} attempted · {s.not_started} not started
                </p>
              </div>
              <span className="shrink-0 text-xs text-fg-subtle">{s.completion_pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Only rendered for a class where the caller already has
// owner/collaborator/admin authorization (gated by the parent, same
// as ClassAccessPanel, ProctoredTestsPanel, and AptitudeTestsPanel).
export default function DsaAssignmentsPanel({ classId }: { classId: string }) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/assign?classId=${classId}`)
      .then((r) => r.json())
      .then((d) => setAssignments(d.assignments ?? []))
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return null;

  return (
    <div className="card space-y-5 p-5">
      <div>
        <p className="text-sm font-medium text-fg">DSA assignments</p>
        <p className="text-xs text-fg-muted">
          Question sets assigned to this class — build and assign a new one from the Assign page.
        </p>
      </div>

      <div className="space-y-2">
        {assignments.length === 0 && <p className="text-xs text-fg-subtle">No DSA assignments yet.</p>}
        {assignments.map((a) => (
          <div key={a.id} className="rounded-lg border border-line/70 px-3 py-2">
            <button
              type="button"
              onClick={() => setExpandedId((cur) => (cur === a.id ? null : a.id))}
              className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{a.question_set_name}</p>
                <p className="text-xs text-fg-muted">
                  {a.question_count} question{a.question_count === 1 ? "" : "s"}
                  {a.due_date && ` · Due ${a.due_date}`}
                </p>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform ${expandedId === a.id ? "rotate-180" : ""}`}
              />
            </button>
            {expandedId === a.id && <AssignmentDetail assignmentId={a.id} />}
          </div>
        ))}
      </div>
    </div>
  );
}
