"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InterviewCategoryWithCount } from "@/types";
import { getInterviewIcon } from "@/lib/interviewIcons";

// Teacher-authored categories (interview_categories), fetched from the
// API — shown on the student Interview Prep page under the static guides.
export default function CategoryGrid() {
  const [categories, setCategories] = useState<InterviewCategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/interview-prep/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {loading && <p className="text-sm text-fg-muted">Loading…</p>}

      {!loading && categories.length === 0 && (
        <p className="card p-6 text-center text-sm text-fg-muted">
          No categories yet — check back once your teacher adds some.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const Icon = getInterviewIcon(c.icon);
          return (
            <Link
              key={c.id}
              href={`/student/interview-prep/${c.slug}`}
              className="card block p-5 transition-colors hover:border-line"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg text-fg">{c.name}</p>
              {c.description && <p className="mt-1 text-sm text-fg-muted">{c.description}</p>}
              <p className="mt-3 text-xs text-fg-subtle">
                {c.question_count} topic{c.question_count === 1 ? "" : "s"}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
