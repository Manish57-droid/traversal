import Link from "next/link";
import { BookOpen } from "lucide-react";
import { INTERVIEW_GUIDES } from "@/lib/interview-guides";
import { getInterviewIcon } from "@/lib/interviewIcons";
import CategoryGrid from "@/components/interview-prep/CategoryGrid";

// Server component so the static guides (lib/interview-guides) are read
// here and only their names/counts reach the client — the teacher-
// authored categories below still load client-side from the API.
export default function StudentInterviewPrepPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Interview preparation</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Important topics to know for interviews, each with an in-depth explanation — organized by subject.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-subtle">In-depth guides</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTERVIEW_GUIDES.map((g) => {
            const Icon = getInterviewIcon(g.icon);
            return (
              <Link
                key={g.slug}
                href={`/student/interview-prep/guides/${g.slug}`}
                className="card block p-5 transition-colors hover:border-accent/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="flex items-center gap-1 rounded-full border border-accent/40 px-2 py-0.5 text-xs text-accent">
                    <BookOpen className="h-3.5 w-3.5" /> Guide
                  </span>
                </div>
                <p className="mt-4 font-display text-lg text-fg">{g.name}</p>
                <p className="mt-1 text-sm text-fg-muted">{g.description}</p>
                <p className="mt-3 text-xs text-fg-subtle">{g.topics.length} topics · one per page</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs uppercase tracking-wide text-fg-subtle">Topics by subject</h2>
        <CategoryGrid />
      </section>
    </div>
  );
}
