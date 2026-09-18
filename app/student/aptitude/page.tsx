import Link from "next/link";
import AssignedAptitudeTests from "@/components/AssignedAptitudeTests";
import type { AptitudeCategory } from "@/types";

const CATEGORIES: { slug: AptitudeCategory; title: string; blurb: string }[] = [
  { slug: "quant", title: "Quant", blurb: "Numbers, percentages, time & work, and other arithmetic reasoning." },
  { slug: "logical", title: "Logical", blurb: "Puzzles, sequences, and pattern-based reasoning questions." },
  { slug: "verbal", title: "Verbal", blurb: "Reading comprehension, vocabulary, and grammar-based questions." },
];

export default function StudentAptitudePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Aptitude practice</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Pick a category, then a topic, and work through questions at your own pace — you'll get
          feedback and an explanation right after each answer.
        </p>
      </div>

      <AssignedAptitudeTests />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/student/aptitude/practice/${c.slug}`}
            className="card block p-5 transition-colors hover:border-line"
          >
            <p className="font-display text-xl text-fg">{c.title}</p>
            <p className="mt-2 text-sm text-fg-muted">{c.blurb}</p>
            <p className="mt-3 text-xs text-success">Browse topics →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
