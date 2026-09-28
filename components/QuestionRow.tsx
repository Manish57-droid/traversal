"use client";

import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/platform";
import { DIFFICULTY_LABELS, DIFFICULTY_BADGE_STYLE } from "@/lib/difficulty";
import CompanyBadge from "@/components/CompanyBadge";
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

  // Combined across every company tagged on this question — omitted
  // entirely when none of them have a frequency set.
  const totalFrequency = question.companies.reduce((sum, c) => sum + (c.frequency ?? 0), 0);
  const hasFrequency = question.companies.some((c) => c.frequency !== null);

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {question.companies.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-1.5 pt-0.5">
            {question.companies.map((c) => (
              <CompanyBadge key={c.id} name={c.name} />
            ))}
          </div>
        )}

        <div className="min-w-0">
          {question.url ? (
            <a
              href={question.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate font-medium text-fg hover:text-success hover:underline"
            >
              {question.title}
            </a>
          ) : (
            <p className="truncate font-medium text-fg-muted">{question.title}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
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
            {question.needs_link_curation && (
              <span className="rounded border border-warn/40 px-2 py-0.5 text-xs text-warn">Link coming soon</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
        {hasFrequency && (
          <span className="rounded-full border border-line/70 px-2 py-1 text-xs text-fg-muted" title="Combined asked-frequency across tagged companies">
            Asked ×{totalFrequency}
          </span>
        )}
        {question.difficulty !== "unknown" && (
          <span className={`rounded-full border px-2 py-1 text-xs capitalize ${DIFFICULTY_BADGE_STYLE[question.difficulty]}`}>
            {DIFFICULTY_LABELS[question.difficulty]}
          </span>
        )}
        <button
          onClick={() => onStatusChange(cycle[status])}
          className="flex items-center gap-2 rounded-lg border border-line/70 px-3 py-2 text-sm transition-colors hover:border-line"
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
    </div>
  );
}
