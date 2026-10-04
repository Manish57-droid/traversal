"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, List, X } from "lucide-react";
import { getInterviewIcon } from "@/lib/interviewIcons";
import { DIFFICULTY_BADGE_STYLE, DIFFICULTY_LABELS } from "@/lib/difficulty";
import { lastTopicKey, type GuideTopicSummary } from "@/lib/interview-guides/shared";
import GuideArticle from "./GuideArticle";

// Page numbers to show around the current page, with "…" gaps:
// 1 … 4 5 [6] 7 8 … 28
function pageWindow(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

function TopicNav({
  guideSlug,
  topics,
  currentIndex,
  onNavigate,
}: {
  guideSlug: string;
  topics: GuideTopicSummary[];
  currentIndex: number;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-0.5">
      {topics.map((t, i) => (
        <Link
          key={t.slug}
          href={`/student/interview-prep/guides/${guideSlug}/${t.slug}`}
          onClick={onNavigate}
          aria-current={i === currentIndex ? "page" : undefined}
          className={`flex gap-2 rounded-lg px-3 py-2 text-xs transition-colors ${
            i === currentIndex ? "bg-accent/10 text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
          }`}
        >
          <span className="w-5 shrink-0 text-right text-fg-subtle">{i + 1}.</span>
          <span className="line-clamp-2">{t.title}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function GuideReader({
  guide,
  topics,
  currentIndex,
  body,
  readMinutes,
}: {
  guide: { slug: string; name: string; icon: string };
  topics: GuideTopicSummary[];
  currentIndex: number;
  body: string;
  readMinutes: number;
}) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const topic = topics[currentIndex];
  const prev = topics[currentIndex - 1];
  const next = topics[currentIndex + 1];
  const total = topics.length;
  const hrefFor = (i: number) => `/student/interview-prep/guides/${guide.slug}/${topics[i].slug}`;
  const Icon = getInterviewIcon(guide.icon);

  // Per-viewer convenience only: lets the guide overview offer
  // "Continue reading". Storage can be unavailable — never required.
  useEffect(() => {
    try {
      localStorage.setItem(lastTopicKey(guide.slug), topic.slug);
    } catch {}
  }, [guide.slug, topic.slug]);

  // ← / → turn pages, unless the reader is typing somewhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "ArrowLeft" && currentIndex > 0) router.push(hrefFor(currentIndex - 1));
      if (e.key === "ArrowRight" && currentIndex < total - 1) router.push(hrefFor(currentIndex + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentIndex, total, guide.slug, router]); // hrefFor depends only on these

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-1 text-xs text-fg-muted">
          <Link href="/student/interview-prep" className="hover:text-fg">
            Interview preparation
          </Link>
          <span>/</span>
          <Link href={`/student/interview-prep/guides/${guide.slug}`} className="hover:text-fg">
            {guide.name}
          </Link>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent sm:flex">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-fg-subtle">
              Topic {currentIndex + 1} of {total}
            </p>
            <h1 className="font-display text-2xl text-fg sm:text-3xl">{topic.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-fg-muted">
              <span className={`rounded-full border px-2 py-0.5 ${DIFFICULTY_BADGE_STYLE[topic.difficulty]}`}>
                {DIFFICULTY_LABELS[topic.difficulty]}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {readMinutes} min read
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent" style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
        </div>
      </div>

      {/* Mobile: the topic list lives in a drawer — no room for two columns. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="btn-secondary w-full justify-center gap-2 text-sm lg:hidden"
      >
        <List className="h-4 w-4" />
        All {total} topics
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-3">
            <p className="mb-2 px-3 text-xs uppercase tracking-wide text-fg-subtle">{total} topics</p>
            <TopicNav guideSlug={guide.slug} topics={topics} currentIndex={currentIndex} />
          </div>
        </aside>

        <div className="min-w-0 space-y-6">
          <div className="card px-5 py-6 sm:px-8 sm:py-8">
            <GuideArticle content={body} />
          </div>

          {/* Previous / next */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={hrefFor(currentIndex - 1)} className="card group block p-4 transition-colors hover:border-accent/60">
                <span className="flex items-center gap-1 text-xs text-fg-subtle">
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </span>
                <span className="mt-1 block text-sm font-medium text-fg group-hover:text-accent">{prev.title}</span>
              </Link>
            ) : (
              <div className="hidden sm:block" />
            )}
            {next ? (
              <Link
                href={hrefFor(currentIndex + 1)}
                className="card group block p-4 text-right transition-colors hover:border-accent/60"
              >
                <span className="flex items-center justify-end gap-1 text-xs text-fg-subtle">
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </span>
                <span className="mt-1 block text-sm font-medium text-fg group-hover:text-accent">{next.title}</span>
              </Link>
            ) : (
              <Link
                href={`/student/interview-prep/guides/${guide.slug}`}
                className="card group block p-4 text-right transition-colors hover:border-accent/60"
              >
                <span className="text-xs text-fg-subtle">You&apos;ve reached the end</span>
                <span className="mt-1 block text-sm font-medium text-fg group-hover:text-accent">Back to all topics</span>
              </Link>
            )}
          </div>

          {/* Numbered pages */}
          <nav aria-label="Topic pages" className="flex flex-wrap items-center justify-center gap-1">
            {pageWindow(currentIndex + 1, total).map((p, i) =>
              p === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-sm text-fg-subtle">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={hrefFor(p - 1)}
                  aria-current={p === currentIndex + 1 ? "page" : undefined}
                  title={topics[p - 1].title}
                  className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors ${
                    p === currentIndex + 1
                      ? "border-accent bg-accent text-ink-fixed"
                      : "border-line/70 text-fg-muted hover:border-accent/60 hover:text-fg"
                  }`}
                >
                  {p}
                </Link>
              )
            )}
          </nav>
          <p className="hidden text-center text-xs text-fg-subtle sm:block">Tip: use ← and → to turn pages</p>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm" />
          <div
            className="relative flex h-full w-72 flex-col border-l border-line bg-bg p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-fg">{guide.name}</p>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto">
              <TopicNav
                guideSlug={guide.slug}
                topics={topics}
                currentIndex={currentIndex}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
