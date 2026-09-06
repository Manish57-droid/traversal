"use client";

import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/platform";
import type { Question, QuestionStatus } from "@/types";

const STATUS_LABEL: Record<QuestionStatus, string> = {
  not_started: "Not started",
  attempted: "Attempted",
  completed: "Completed",
};

export default function QuestionRow({
  question,
  status,
  onStatusChange,
}: {
  question: Question;
  status: QuestionStatus;
  onStatusChange: (next: QuestionStatus) => void;
}) {
  const cycle: Record<QuestionStatus, QuestionStatus> = {
    not_started: "attempted",
    attempted: "completed",
    completed: "not_started",
  };

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded px-2 py-0.5 text-xs font-medium text-ink"
            style={{ backgroundColor: PLATFORM_COLORS[question.platform] }}
          >
            {PLATFORM_LABELS[question.platform]}
          </span>
          {question.topic && (
            <span className="rounded border border-white/10 px-2 py-0.5 text-xs text-slate-400">
              {question.topic}
            </span>
          )}
          {question.difficulty !== "unknown" && (
            <span className="text-xs capitalize text-slate-400">{question.difficulty}</span>
          )}
        </div>
        <a
          href={question.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block truncate font-medium text-slate-100 hover:text-sky hover:underline"
        >
          {question.title}
        </a>
      </div>

      <button
        onClick={() => onStatusChange(cycle[status])}
        className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:border-white/25 sm:self-auto"
        aria-label={`Mark as ${cycle[status].replace("_", " ")}`}
      >
        <span
          className={`h-3 w-3 rounded-full ${
            status === "completed"
              ? "bg-sky"
              : status === "attempted"
              ? "bg-ember"
              : "border border-slate-500"
          }`}
        />
        {STATUS_LABEL[status]}
      </button>
    </div>
  );
}
