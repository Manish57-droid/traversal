"use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Award } from "lucide-react";
import type { ProctoredLeaderboardWidget as WidgetData, ProctoredLeaderboardRow } from "@/types";

// Rank 1-3 get a medal treatment (icon, color, bigger text); everyone
// else falls back to a plain numbered row. Colors come from the
// dedicated gold/silver/bronze tokens (app/globals.css) rather than
// the success/warn/review tokens — gold/silver/bronze is a fixed,
// universal association, not one of this app's semantic states, and
// those tokens are theme-aware (light/dark) the same way as the rest
// of the app's palette.
const RANK_STYLE: Record<number, { icon: typeof Trophy; text: string; ring: string; bg: string }> = {
  1: { icon: Trophy, text: "text-gold", ring: "ring-gold/50", bg: "bg-gold/10" },
  2: { icon: Medal, text: "text-silver", ring: "ring-silver/50", bg: "bg-silver/10" },
  3: { icon: Award, text: "text-bronze", ring: "ring-bronze/50", bg: "bg-bronze/10" },
};

function LeaderboardRow({ row, highlight }: { row: ProctoredLeaderboardRow; highlight?: boolean }) {
  const medal = RANK_STYLE[row.rank];

  if (medal) {
    const Icon = medal.icon;
    return (
      <div className={`flex items-center justify-between gap-3 rounded-xl border ${medal.ring} ${medal.bg} px-4 py-3`}>
        <div className="flex min-w-0 items-center gap-3">
          <Icon className={`h-6 w-6 shrink-0 ${medal.text}`} />
          <div className="min-w-0">
            <p className={`truncate font-display text-base font-semibold ${medal.text}`}>
              {row.student_name}
              {highlight && <span className="ml-1 font-sans text-xs font-normal text-fg-muted">(you)</span>}
            </p>
            <p className="text-xs text-fg-subtle">Rank #{row.rank}</p>
          </div>
        </div>
        <span className={`shrink-0 font-display text-lg font-bold ${medal.text}`}>
          {row.score}
          {(row.max_score ?? row.total_questions) !== null && (
            <span className="text-sm font-normal">/{row.max_score ?? row.total_questions}</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
        highlight ? "border border-accent/40 bg-accent/5" : "bg-surface-2"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className={`w-6 shrink-0 text-right font-display ${highlight ? "text-accent" : "text-fg-muted"}`}>
          #{row.rank}
        </span>
        <span className="truncate text-fg">
          {row.student_name}
          {highlight && " (you)"}
        </span>
      </div>
      <span className="shrink-0 font-medium text-fg">
        {row.score}
        {(row.max_score ?? row.total_questions) !== null && `/${row.max_score ?? row.total_questions}`}
      </span>
    </div>
  );
}

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
        <Trophy className="h-4 w-4 text-gold" />
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
        <div className="space-y-2">
          {data.top.map((row) => (
            <LeaderboardRow key={row.attempt_id} row={row} />
          ))}

          {!data.me_in_top && data.me && (
            <>
              <div className="my-1 border-t border-dashed border-line/70" />
              <LeaderboardRow row={data.me} highlight />
            </>
          )}
        </div>
      )}
    </div>
  );
}
