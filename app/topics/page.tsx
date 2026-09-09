import Link from "next/link";
import { CONCEPT_TOPICS } from "@/lib/concepts/data";

export default function TopicsIndexPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-white sm:text-3xl">DSA topics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Step through each concept in 3D — play it end to end, or scrub through at your own pace.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {CONCEPT_TOPICS.map((topic) => (
          <Link key={topic.slug} href={`/topics/${topic.slug}`} className="card block p-5 transition-colors hover:border-white/25">
            <p className="font-display text-xl text-white">{topic.title}</p>
            <p className="mt-2 text-sm text-slate-400">{topic.summary}</p>
            <p className="mt-3 text-xs text-success">{topic.steps.length} steps →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
