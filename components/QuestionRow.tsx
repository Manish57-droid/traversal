"use client";

import { DIFFICULTY_LABELS, DIFFICULTY_BADGE_STYLE } from "@/lib/difficulty";
import CompanyBadge from "@/components/CompanyBadge";
import type { Question, QuestionStatus } from "@/types";

const STATUS_LABEL: Record<QuestionStatus, string> = {
  not_started: "Not started",
  attempted: "Attempted",
  completed: "Completed",
};

// Caps how many chips render inline before collapsing into "+N more"
// — a question can carry ~5 companies and ~3 topics on average in the
// imported dataset, too many to show in full inside a table cell.
const MAX_CHIPS = 2;

function TopicChip({ name }: { name: string }) {
  return <span className="rounded border border-line/70 px-1.5 py-0.5 text-xs text-fg-muted">{name}</span>;
}

function ChipOverflow({ count }: { count: number }) {
  if (count <= 0) return null;
  return <span className="text-xs text-fg-subtle">+{count} more</span>;
}

export default function QuestionRow({
  index,
  question,
  status,
  companyFilter,
  onStatusChange,
}: {
  /** 1-based row number across the whole filtered set, not just this page. */
  index: number;
  question: Question;
  status: QuestionStatus;
  /** When a specific company is selected in the filter, the Frequency
   * column shows THAT company's number instead of the max across all. */
  companyFilter?: string;
  onStatusChange: (next: QuestionStatus) => void;
}) {
  const cycle: Record<QuestionStatus, QuestionStatus> = {
    not_started: "attempted",
    attempted: "completed",
    completed: "not_started",
  };

  const shownCompanies = question.companies.slice(0, MAX_CHIPS);
  const extraCompanies = question.companies.length - shownCompanies.length;

  const shownTopics = question.topics.slice(0, MAX_CHIPS);
  const extraTopics = question.topics.length - shownTopics.length;

  const frequency = companyFilter
    ? question.companies.find((c) => c.id === companyFilter)?.frequency ?? null
    : question.companies.reduce((max, c) => (c.frequency !== null && c.frequency > (max ?? -Infinity) ? c.frequency : max), null as number | null);

  return (
    <tr className="border-b border-line/40 align-top last:border-0 hover:bg-surface-2/40">
      <td className="py-3 pr-3 text-xs text-fg-subtle">{index}</td>
      <td className="py-3 pr-3">
        {question.companies.length === 0 ? (
          <span className="text-xs text-fg-subtle">—</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {shownCompanies.map((c) => (
              <CompanyBadge key={c.id} name={c.name} />
            ))}
            <ChipOverflow count={extraCompanies} />
          </div>
        )}
      </td>
      <td className="min-w-[220px] py-3 pr-3">
        {question.url ? (
          <a href={question.url} target="_blank" rel="noopener noreferrer" className="font-medium text-fg hover:text-success hover:underline">
            {question.title}
          </a>
        ) : (
          <span className="font-medium text-fg-muted">{question.title}</span>
        )}
        {question.needs_link_curation && (
          <span className="ml-2 rounded border border-warn/40 px-1.5 py-0.5 text-xs text-warn">Link coming soon</span>
        )}
      </td>
      <td className="py-3 pr-3 text-sm text-fg-muted">{frequency !== null ? `×${frequency}` : "—"}</td>
      <td className="py-3 pr-3">
        {question.topics.length === 0 ? (
          <span className="text-xs text-fg-subtle">Uncategorized</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {shownTopics.map((t) => (
              <TopicChip key={t.id} name={t.name} />
            ))}
            <ChipOverflow count={extraTopics} />
          </div>
        )}
      </td>
      <td className="py-3 pr-3">
        {question.difficulty !== "unknown" ? (
          <span className={`rounded-full border px-2 py-1 text-xs capitalize ${DIFFICULTY_BADGE_STYLE[question.difficulty]}`}>
            {DIFFICULTY_LABELS[question.difficulty]}
          </span>
        ) : (
          <span className="text-xs text-fg-subtle">—</span>
        )}
      </td>
      <td className="py-3">
        <button
          onClick={() => onStatusChange(cycle[status])}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-line/70 px-3 py-2 text-sm transition-colors hover:border-line"
          aria-label={`Mark as ${cycle[status].replace("_", " ")}`}
        >
          <span
            className={`h-3 w-3 rounded-full ${
              status === "completed" ? "bg-success" : status === "attempted" ? "bg-warn" : "border border-line"
            }`}
          />
          {STATUS_LABEL[status]}
        </button>
      </td>
    </tr>
  );
}
