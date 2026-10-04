import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { getGuide } from "@/lib/interview-guides";
import { getInterviewIcon } from "@/lib/interviewIcons";
import { DIFFICULTY_BADGE_STYLE, DIFFICULTY_LABELS } from "@/lib/difficulty";
import ContinueReading from "@/components/interview-prep/ContinueReading";

// Guide overview: what's covered, in reading order, and where to start.
export default function GuideOverviewPage({ params }: { params: { guide: string } }) {
  const guide = getGuide(params.guide);
  if (!guide) notFound();

  const Icon = getInterviewIcon(guide.icon);
  const totalMinutes = guide.topics.reduce((sum, t) => sum + t.readMinutes, 0);
  const summaries = guide.topics.map(({ slug, title, difficulty }) => ({ slug, title, difficulty }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student/interview-prep" className="text-xs text-fg-muted hover:text-fg">
          ← Interview preparation
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Icon className="h-5 w-5" />
          </div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">{guide.name}</h1>
        </div>
        <p className="mt-1 text-sm text-fg-muted">{guide.description}</p>
        <p className="mt-2 flex items-center gap-1 text-xs text-fg-subtle">
          {guide.topics.length} topics, basics to advanced
          <span className="mx-1">·</span>
          <Clock className="h-3.5 w-3.5" /> about {Math.round(totalMinutes / 6) / 10} hours of reading
        </p>
      </div>

      <ContinueReading guideSlug={guide.slug} topics={summaries} />

      <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {guide.topics.map((t, i) => (
          <li key={t.slug}>
            <Link
              href={`/student/interview-prep/guides/${guide.slug}/${t.slug}`}
              className="card group flex h-full items-start gap-3 p-4 transition-colors hover:border-accent/60"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs text-fg-muted">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg group-hover:text-accent">{t.title}</span>
                <span className="mt-2 flex items-center gap-3 text-xs text-fg-subtle">
                  <span className={`rounded-full border px-2 py-0.5 ${DIFFICULTY_BADGE_STYLE[t.difficulty]}`}>
                    {DIFFICULTY_LABELS[t.difficulty]}
                  </span>
                  {t.readMinutes} min read
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
