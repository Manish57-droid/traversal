"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ClassAnalyticsSummary } from "@/types";

// Recharts renders straight to SVG attributes/inline styles, so plain
// Tailwind token classes don't reach it — these pull the same design
// tokens via `rgb(var(--x))` CSS color strings instead, which resolve
// live against whichever theme is active (no JS re-read needed on
// toggle, same as any other CSS var reference).
const GRID = "rgb(var(--line))";
const TICK = "rgb(var(--fg-muted))";
const TOOLTIP_STYLE = {
  background: "rgb(var(--surface))",
  border: "1px solid rgb(var(--line))",
  borderRadius: 8,
  fontSize: 12,
};
const TOOLTIP_TEXT = { color: "rgb(var(--fg))" };

export default function ClassSummaryCharts({ summary }: { summary: ClassAnalyticsSummary }) {
  const dsaData = [
    { name: "Completed", value: summary.dsa.completed, color: "rgb(var(--success))" },
    { name: "Attempted", value: summary.dsa.attempted, color: "rgb(var(--warn))" },
    { name: "Not started", value: summary.dsa.not_started, color: "rgb(var(--fg-subtle))" },
  ];
  const aptitudeData = [
    { name: "Correct", value: summary.aptitude.correct, color: "rgb(var(--success))" },
    { name: "Incorrect", value: summary.aptitude.incorrect, color: "rgb(var(--warn))" },
  ];
  const aptitudeTotal = summary.aptitude.correct + summary.aptitude.incorrect;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="card p-5">
        <p className="text-sm font-medium text-fg">DSA completion</p>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dsaData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: TICK, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: TICK, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
              <Tooltip cursor={{ fill: "rgb(var(--surface-2))" }} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_TEXT} itemStyle={TOOLTIP_TEXT} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {dsaData.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-fg">Aptitude accuracy</p>
        <div className="mt-4 h-64">
          {aptitudeTotal === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-fg-muted">
              No aptitude attempts yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={aptitudeData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="85%" paddingAngle={2}>
                  {aptitudeData.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke="rgb(var(--surface))" />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_TEXT} itemStyle={TOOLTIP_TEXT} />
                <Legend wrapperStyle={{ fontSize: 12, color: TICK }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
