"use client";

import { useEffect, useState } from "react";
import { LogOut, Users } from "lucide-react";

interface StudentClassRow {
  id: string;
  name: string;
  teacher_name: string;
  joined_at: string;
}

export default function StudentClassesPage() {
  const [classes, setClasses] = useState<StudentClassRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/student/classes");
    const data = await res.json();
    setClasses(data.classes ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinMessage(null);
    setJoining(true);
    const res = await fetch("/api/classes/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ join_code: joinCode }),
    });
    const data = await res.json();
    setJoinMessage(res.ok ? "Joined! Your teacher can now assign you questions." : data.error);
    if (res.ok) {
      setJoinCode("");
      await load();
    }
    setJoining(false);
  }

  async function handleLeave(cls: StudentClassRow) {
    if (!confirm(`Leave "${cls.name}"? You'll need the join code again to get back in.`)) return;
    setLeavingId(cls.id);
    await fetch(`/api/student/classes/${cls.id}`, { method: "DELETE" });
    await load();
    setLeavingId(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">My classes</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Every class you've joined. Leave one if it was joined by mistake or you no longer need it.
        </p>
      </div>

      <div className="card max-w-md p-5">
        <h2 className="mb-1 text-sm font-medium text-fg">Join a class</h2>
        <p className="mb-3 text-xs text-fg-muted">
          Enter the code your teacher shared so they can assign you questions.
        </p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            className="input"
            placeholder="e.g. a1b2c3"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <button type="submit" className="btn-secondary" disabled={joining}>
            {joining ? "Joining..." : "Join"}
          </button>
        </form>
        {joinMessage && <p className="mt-2 text-xs text-fg-muted">{joinMessage}</p>}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-sm text-fg-muted">Loading…</p>}
        {!loading && classes.length === 0 && (
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <Users className="h-8 w-8 text-fg-subtle" />
            <p className="text-sm text-fg-muted">You haven't joined any classes yet — use a join code above.</p>
          </div>
        )}
        {classes.map((c) => (
          <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium text-fg">{c.name}</p>
              <p className="text-xs text-fg-muted">
                Taught by {c.teacher_name} · Joined {new Date(c.joined_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={() => handleLeave(c)}
              disabled={leavingId === c.id}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-fg-muted transition-colors hover:border-warn/50 hover:text-warn disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {leavingId === c.id ? "Leaving..." : "Leave class"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
