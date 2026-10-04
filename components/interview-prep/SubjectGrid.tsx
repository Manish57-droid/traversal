"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import type { InterviewCategoryWithCount } from "@/types";
import type { GuideInfo } from "@/lib/interview-guides/shared";
import { getInterviewIcon } from "@/lib/interviewIcons";

export type GuideCardInfo = GuideInfo & { topicCount: number };

interface Subject {
  key: string;
  name: string;
  description: string | null;
  icon: string;
  href: string;
  guideTopics: number;
  teacherTopics: number;
}

// One card per subject on the student Interview Prep page. A subject
// can have a static guide (lib/interview-guides), teacher-authored
// topics (interview_categories), or both — matched by slug. A subject
// with a guide opens the guide; the guide page links on to its
// teacher-added topics.
function mergeSubjects(categories: InterviewCategoryWithCount[], guides: GuideCardInfo[]): Subject[] {
  const subjects: Subject[] = categories.map((c) => {
    const guide = guides.find((g) => g.slug === c.slug);
    return {
      key: c.id,
      name: c.name,
      description: c.description,
      icon: c.icon,
      href: guide ? `/student/interview-prep/guides/${guide.slug}` : `/student/interview-prep/${c.slug}`,
      guideTopics: guide?.topicCount ?? 0,
      teacherTopics: c.question_count,
    };
  });
  // Guides for subjects that have no category yet go after the rest.
  for (const g of guides) {
    if (categories.some((c) => c.slug === g.slug)) continue;
    subjects.push({
      key: `guide-${g.slug}`,
      name: g.name,
      description: g.description,
      icon: g.icon,
      href: `/student/interview-prep/guides/${g.slug}`,
      guideTopics: g.topicCount,
      teacherTopics: 0,
    });
  }
  return subjects;
}

function topicCountLabel(s: Subject) {
  const plural = (n: number) => `${n} topic${n === 1 ? "" : "s"}`;
  if (s.guideTopics && s.teacherTopics) return `${plural(s.guideTopics)} in the guide · ${s.teacherTopics} more from teachers`;
  return plural(s.guideTopics || s.teacherTopics);
}

export default function SubjectGrid({ guides }: { guides: GuideCardInfo[] }) {
  const [categories, setCategories] = useState<InterviewCategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/interview-prep/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false));
  }, []);

  // Wait for the categories before drawing, so guide cards don't jump
  // around when the teacher-authored subjects merge in.
  if (loading) return <p className="text-sm text-fg-muted">Loading…</p>;

  const subjects = mergeSubjects(categories, guides);

  if (subjects.length === 0) {
    return (
      <p className="card p-6 text-center text-sm text-fg-muted">
        No categories yet — check back once your teacher adds some.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((s) => {
        const Icon = getInterviewIcon(s.icon);
        return (
          <Link
            key={s.key}
            href={s.href}
            className="card block p-5 transition-colors hover:border-accent/60"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              {s.guideTopics > 0 && (
                <span className="flex items-center gap-1 rounded-full border border-accent/40 px-2 py-0.5 text-xs text-accent">
                  <BookOpen className="h-3.5 w-3.5" /> Full guide
                </span>
              )}
            </div>
            <p className="mt-4 font-display text-lg text-fg">{s.name}</p>
            {s.description && <p className="mt-1 text-sm text-fg-muted">{s.description}</p>}
            <p className="mt-3 text-xs text-fg-subtle">{topicCountLabel(s)}</p>
          </Link>
        );
      })}
    </div>
  );
}
