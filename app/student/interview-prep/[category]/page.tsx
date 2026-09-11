"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { InterviewCategoryWithCount, InterviewQuestion } from "@/types";
import { getInterviewIcon } from "@/lib/interviewIcons";

function QuestionAccordionItem({ q }: { q: InterviewQuestion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <span className="font-medium text-fg">{q.question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-line/70 px-4 py-4">
          <p className="whitespace-pre-wrap text-sm text-fg-muted">{q.answer}</p>
          <div className="mt-3 flex items-center gap-2 text-xs text-fg-subtle">
            {q.difficulty !== "unknown" && <span className="capitalize">{q.difficulty}</span>}
            {q.created_by_name && <span>· Added by {q.created_by_name}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function InterviewPrepCategoryPage() {
  const params = useParams<{ category: string }>();
  const slug = params.category;

  const [category, setCategory] = useState<InterviewCategoryWithCount | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [loading, setLoading] = useState(true);

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

  const Icon = category ? getInterviewIcon(category.icon) : null;

  return (
    <div className="space-y-8">
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
          No questions in this category yet — check back once your teacher adds some.
        </p>
      )}

      <div className="space-y-3">
        {questions.map((q) => (
          <QuestionAccordionItem key={q.id} q={q} />
        ))}
      </div>
    </div>
  );
}
