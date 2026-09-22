"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, List, X } from "lucide-react";
import type { InterviewCategoryWithCount, InterviewQuestion } from "@/types";
import { getInterviewIcon } from "@/lib/interviewIcons";
import AnswerContent from "@/components/interview-prep/AnswerContent";

function QuestionAccordionItem({
  q,
  index,
  isOpen,
  onToggle,
  registerRef,
}: {
  q: InterviewQuestion;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div ref={registerRef} id={`q-${q.id}`} data-question-id={q.id} className="card scroll-mt-24 overflow-hidden">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-4 p-4 text-left">
        <span className="font-medium text-fg">
          <span className="mr-2 text-fg-subtle">{index}.</span>
          {q.question}
        </span>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-fg-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="border-t border-line/70 px-4 py-4">
          <AnswerContent content={q.answer} />
          <div className="mt-3 flex items-center gap-2 text-xs text-fg-subtle">
            {q.difficulty !== "unknown" && <span className="capitalize">{q.difficulty}</span>}
            {q.created_by_name && <span>· Added by {q.created_by_name}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// Numbered question list shared by the desktop sidebar and the
// mobile "Jump to question" drawer.
function QuestionNav({
  questions,
  activeId,
  onJump,
}: {
  questions: InterviewQuestion[];
  activeId: string | null;
  onJump: (id: string) => void;
}) {
  return (
    <nav className="space-y-1">
      {questions.map((q, i) => (
        <button
          key={q.id}
          type="button"
          onClick={() => onJump(q.id)}
          className={`block w-full truncate rounded-lg px-3 py-2 text-left text-xs transition-colors ${
            activeId === q.id ? "bg-accent/10 text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
          }`}
          title={q.question}
        >
          {i + 1}. {q.question}
        </button>
      ))}
    </nav>
  );
}

export default function InterviewPrepCategoryPage() {
  const params = useParams<{ category: string }>();
  const slug = params.category;

  const [category, setCategory] = useState<InterviewCategoryWithCount | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Multiple questions can stay open at once — jumping to a new one
  // from the sidebar doesn't collapse whatever you already had open.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/interview-prep/categories").then((r) => r.json()),
      fetch(`/api/interview-prep/questions?categorySlug=${slug}`).then((r) => r.json()),
    ])
      .then(([catData, qData]) => {
        const match = (catData.categories ?? []).find((c: InterviewCategoryWithCount) => c.slug === slug);
        setCategory(match ?? null);
        setQuestions(qData.questions ?? []);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Scroll-spy: highlight whichever question is most visible in the
  // main column as the user scrolls, not just on click.
  useEffect(() => {
    if (!questions.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = (visible[0].target as HTMLElement).dataset.questionId;
          if (id) setActiveId(id);
        }
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    Object.values(itemRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [questions]);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function jumpTo(id: string) {
    setOpenIds((prev) => new Set(prev).add(id));
    setActiveId(id);
    setDrawerOpen(false);
    itemRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const Icon = category ? getInterviewIcon(category.icon) : null;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student/interview-prep" className="text-xs text-fg-muted hover:text-fg">
          ← Interview preparation
        </Link>
        <div className="mt-2 flex items-center gap-3">
          {Icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <h1 className="font-display text-2xl text-fg sm:text-3xl">{category?.name ?? slug}</h1>
        </div>
        {category?.description && <p className="mt-1 text-sm text-fg-muted">{category.description}</p>}
      </div>

      {loading && <p className="text-sm text-fg-muted">Loading…</p>}

      {!loading && questions.length === 0 && (
        <p className="card p-6 text-center text-sm text-fg-muted">
          No topics in this category yet — check back once your teacher adds some.
        </p>
      )}

      {!loading && questions.length > 0 && (
        <>
          {/* Mobile: collapsed into a drawer trigger — no room for two columns. */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="btn-secondary w-full justify-center gap-2 text-sm lg:hidden"
          >
            <List className="h-4 w-4" />
            Jump to topic
          </button>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block">
              <div className="card sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto p-3">
                <p className="mb-2 px-3 text-xs uppercase tracking-wide text-fg-subtle">
                  {questions.length} topic{questions.length === 1 ? "" : "s"}
                </p>
                <QuestionNav questions={questions} activeId={activeId} onJump={jumpTo} />
              </div>
            </aside>

            <div className="space-y-3">
              {questions.map((q, i) => (
                <QuestionAccordionItem
                  key={q.id}
                  q={q}
                  index={i + 1}
                  isOpen={openIds.has(q.id)}
                  onToggle={() => toggle(q.id)}
                  registerRef={(el) => (itemRefs.current[q.id] = el)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm" />
          <div className="relative flex h-full w-72 flex-col border-l border-line bg-bg p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-fg">Jump to topic</p>
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
              <QuestionNav questions={questions} activeId={activeId} onJump={jumpTo} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
