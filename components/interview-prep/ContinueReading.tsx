"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { lastTopicKey, type GuideTopicSummary } from "@/lib/interview-guides/shared";

// "Start reading", or "Continue: <topic>" when this browser remembers
// where the reader left off (written by GuideReader).
export default function ContinueReading({ guideSlug, topics }: { guideSlug: string; topics: GuideTopicSummary[] }) {
  const [lastIndex, setLastIndex] = useState(-1);

  useEffect(() => {
    try {
      const slug = localStorage.getItem(lastTopicKey(guideSlug));
      setLastIndex(topics.findIndex((t) => t.slug === slug));
    } catch {}
  }, [guideSlug, topics]);

  const base = `/student/interview-prep/guides/${guideSlug}`;
  const resume = lastIndex > 0 ? topics[lastIndex] : null;

  return (
    <div className="flex flex-wrap gap-2">
      {resume && (
        <Link href={`${base}/${resume.slug}`} className="btn-primary text-sm">
          Continue: {lastIndex + 1}. {resume.title}
        </Link>
      )}
      <Link href={`${base}/${topics[0].slug}`} className={`${resume ? "btn-secondary" : "btn-primary"} text-sm`}>
        {resume ? "Start from topic 1" : "Start reading"}
      </Link>
    </div>
  );
}
