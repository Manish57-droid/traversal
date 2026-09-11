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
            className="rounded px-2 py-0.5 text-xs font-medium text-ink-fixed"
            style={{ backgroundColor: PLATFORM_COLORS[question.platform] }}
          >
            {PLATFORM_LABELS[question.platform]}
          </span>
          {question.topic && (
            <span className="rounded border border-line/70 px-2 py-0.5 text-xs text-fg-muted">
              {question.topic}
            </span>
          )}
          {question.difficulty !== "unknown" && (
            <span className="text-xs capitalize text-fg-muted">{question.difficulty}</span>
          )}
          {question.needs_link_curation && (
            <span className="rounded border border-warn/40 px-2 py-0.5 text-xs text-warn">Link coming soon</span>
          )}
        </div>
        {question.url ? (
          <a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate font-medium text-fg hover:text-success hover:underline"
          >
            {question.title}
          </a>
        ) : (
          <p className="mt-1 truncate font-medium text-fg-muted">{question.title}</p>
        )}
      </div>

      <button
        onClick={() => onStatusChange(cycle[status])}
        className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-line/70 px-3 py-2 text-sm transition-colors hover:border-line sm:self-auto"
        aria-label={`Mark as ${cycle[status].replace("_", " ")}`}
      >
        <span
          className={`h-3 w-3 rounded-full ${
            status === "completed"
              ? "bg-success"
              : status === "attempted"
              ? "bg-warn"
              : "border border-line"
          }`}
        />
        {STATUS_LABEL[status]}
      </button>
    </div>
  );
}
