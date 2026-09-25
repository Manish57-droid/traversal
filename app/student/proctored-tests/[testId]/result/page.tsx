"use client";

import { useSearchParams } from "next/navigation";
import TestResultBanner from "@/components/TestResultBanner";

export default function ProctoredTestResultPage() {
  const searchParams = useSearchParams();

  const status = searchParams.get("status") ?? "submitted";
  const scoreParam = searchParams.get("score");
  const totalParam = searchParams.get("total");
  const score = scoreParam ? Number(scoreParam) : null;
  const total = totalParam ? Number(totalParam) : null;
  const gradingStatus = searchParams.get("grading");

  return (
    <TestResultBanner
      status={status}
      score={score}
      total={total}
      backHref="/student/proctored-tests"
      backLabel="Back to Proctored Tests"
      pendingGrading={gradingStatus === "pending"}
    />
  );
}
