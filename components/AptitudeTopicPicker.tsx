"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import type { AptitudeCategory, AptitudeQuestion } from "@/types";

const CATEGORY_LABELS: Record<AptitudeCategory, string> = {
  quant: "Quant",
  logical: "Logical",
  verbal: "Verbal",
};

export default function AptitudeTopicPickerPage() {
  const params = useParams<{ category: string }>();
  const category = params.category as AptitudeCategory;

  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!(category in CATEGORY_LABELS)) return;
    fetch(`/api/aptitude/questions?category=${category}`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions ?? []))
      .finally(() => setLoading(false));
  }, [category]);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const q of questions) counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [questions]);

  if (!(category in CATEGORY_LABELS)) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/student/aptitude" className="text-xs text-fg-muted hover:text-fg">
          ← Aptitude
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">{CATEGORY_LABELS[category]} topics</h1>
        <p className="mt-1 text-sm text-fg-muted">Pick a topic to start practicing.</p>
      </div>

      {loading && <p className="text-sm text-fg-muted">Loading…</p>}

      {!loading && topics.length === 0 && (
        <p className="card p-6 text-center text-sm text-fg-muted">
          No questions in this category yet — check back once your teacher adds some.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {topics.map(([topic, count]) => (
          <Link
            key={topic}
            href={`/student/aptitude/practice/${category}/${encodeURIComponent(topic)}`}
            className="card flex items-center justify-between p-4 transition-colors hover:border-line"
          >
            <span className="font-medium text-fg">{topic}</span>
            <span className="text-xs text-fg-muted">{count} question{count === 1 ? "" : "s"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
