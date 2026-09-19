"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import type { ProctoredLeaderboardWidget as WidgetData } from "@/types";

// The student dashboard's "Top 5" card for their most recently
// completed AND released proctored test. The server does all the
// gating/picking (see /api/student/proctored-tests/leaderboard) — this
// component only renders whatever it gets back, including the "no
// released test yet" empty state.
export default function ProctoredLeaderboardWidget() {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    fetch("/api/student/proctored-tests/leaderboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ test: null, top: [], me: null, me_in_top: false }));
  }, []);

  if (!data) return null;

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-success" />
        <h2 className="text-sm font-medium text-fg">Leaderboard</h2>
        {data.test && <span className="text-xs text-fg-muted">— {data.test.name} ({data.test.class_name})</span>}
      </div>

      {!data.test && (
        <p className="text-sm text-fg-subtle">
          No released proctored test results yet — once a teacher releases a test you've completed, its leaderboard
          shows up here.
        </p>
      )}

      {data.test && (
        <div className="space-y-1.5">
          {data.top.map((row) => (
            <div key={row.attempt_id} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-6 shrink-0 text-right font-display text-fg-muted">#{row.rank}</span>
                <span className="truncate text-fg">{row.student_name}</span>
              </div>
              <span className="shrink-0 font-medium text-fg">
                {row.score}
                {row.total_questions !== null && `/${row.total_questions}`}
              </span>
            </div>
          ))}

          {!data.me_in_top && data.me && (
            <>
              <div className="my-1 border-t border-dashed border-line/70" />
              <div className="flex items-center justify-between rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-right font-display text-accent">#{data.me.rank}</span>
                  <span className="truncate text-fg">{data.me.student_name} (you)</span>
                </div>
                <span className="shrink-0 font-medium text-fg">
                  {data.me.score}
                  {data.me.total_questions !== null && `/${data.me.total_questions}`}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
