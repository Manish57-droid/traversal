"use client";

import { useSearchParams } from "next/navigation";
import TestResultBanner from "@/components/TestResultBanner";

export default function AptitudeTestResultPage() {
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "submitted";
  const scoreParam = searchParams.get("score");
  const totalParam = searchParams.get("total");
  const score = scoreParam ? Number(scoreParam) : null;
  const total = totalParam ? Number(totalParam) : null;

  return (
    <TestResultBanner
      status={status}
      score={score}
      total={total}
      backHref="/student/aptitude"
      backLabel="Back to Aptitude"
    />
  );
}
