"use client";

import { useEffect, useState } from "react";

interface QuestionSetRow {
  id: string;
  name: string;
  question_set_items: { question_id: string }[];
}

interface ClassRow {
  id: string;
  name: string;
}

export default function TeacherAssignPage() {
  const [sets, setSets] = useState<QuestionSetRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [setId, setSetId] = useState("");
  const [classId, setClassId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/question-sets").then((r) => r.json()).then((d) => {
      setSets(d.question_sets ?? []);
      if (d.question_sets?.length) setSetId(d.question_sets[0].id);
    });
    fetch("/api/classes").then((r) => r.json()).then((d) => {
      setClasses(d.classes ?? []);
      if (d.classes?.length) setClassId(d.classes[0].id);
    });
  }, []);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!setId || !classId) {
      setMessage("Pick a question set and a class first.");
      return;
    }
    const res = await fetch("/api/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question_set_id: setId, class_id: classId, due_date: dueDate || null }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Assigned — the whole set now shows up on each student's sheet." : data.error);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Assign a question set</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Send a whole set to a class at once. Build sets first on the Question sets page.
        </p>
      </div>

      {sets.length === 0 || classes.length === 0 ? (
        <p className="card p-6 text-center text-sm text-fg-muted">
          {sets.length === 0
            ? "Create a question set first on the Question sets page."
            : "Create a class first on the Class progress page."}
        </p>
      ) : (
        <form onSubmit={handleAssign} className="card grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Question set</label>
            <select className="input" value={setId} onChange={(e) => setSetId(e.target.value)}>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.question_set_items?.length ?? 0} questions)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Class</label>
            <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-fg-muted">Due date (optional)</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary self-end">Assign to class</button>
          {message && <p className="text-sm text-fg sm:col-span-2">{message}</p>}
        </form>
      )}
    </div>
  );
}
