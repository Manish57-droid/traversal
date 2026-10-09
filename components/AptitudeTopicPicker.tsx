"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { AptitudeCategory, AptitudeQuestion } from "@/types";
import { normalizeTopicName } from "@/lib/aptitude-theory/shared";
import { APTITUDE_CATEGORY_LABELS } from "@/lib/aptitudeTopics";

// `theoryKeys`: normalized names of the topics that have a theory
// section (lib/aptitude-theory), so their cards can say so.
export default function AptitudeTopicPicker({
  category,
  theoryKeys,
}: {
  category: AptitudeCategory;
  theoryKeys: string[];
}) {
  const [questions, setQuestions] = useState<AptitudeQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const withTheory = useMemo(() => new Set(theoryKeys), [theoryKeys]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/student/aptitude" className="text-xs text-fg-muted hover:text-fg">
          ← Aptitude
        </Link>
        <h1 className="mt-2 font-display text-2xl text-fg sm:text-3xl">{APTITUDE_CATEGORY_LABELS[category]} topics</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Pick a topic. Each one opens with its theory and shortcuts — read those first, then practice.
        </p>
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
            <span className="flex shrink-0 items-center gap-3 text-xs text-fg-muted">
              {withTheory.has(normalizeTopicName(topic)) && (
                <span className="flex items-center gap-1 text-accent">
                  <BookOpen className="h-3.5 w-3.5" />
                  Theory
                </span>
              )}
              {count} question{count === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
