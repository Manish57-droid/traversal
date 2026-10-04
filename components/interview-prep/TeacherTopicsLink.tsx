"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import type { InterviewCategoryWithCount } from "@/types";

// On a guide's overview: links to the teacher-authored topics of the
// same subject (the interview_categories row with the guide's slug),
// if there are any.
export default function TeacherTopicsLink({ slug }: { slug: string }) {
  const [category, setCategory] = useState<InterviewCategoryWithCount | null>(null);

  useEffect(() => {
    fetch("/api/interview-prep/categories")
      .then((r) => r.json())
      .then((d) => {
        const match = (d.categories ?? []).find((c: InterviewCategoryWithCount) => c.slug === slug);
        setCategory(match ?? null);
      })
      .catch(() => {});
  }, [slug]);

  if (!category || category.question_count === 0) return null;

  return (
    <Link
      href={`/student/interview-prep/${category.slug}`}
      className="card group flex items-center gap-3 p-4 transition-colors hover:border-accent/60"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Users className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-fg group-hover:text-accent">
          {category.question_count} more {category.name} topic{category.question_count === 1 ? "" : "s"} from your teachers
        </p>
        <p className="text-xs text-fg-subtle">Short-answer revision topics added by teachers</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
    </Link>
  );
}
