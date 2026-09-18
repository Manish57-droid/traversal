"use client";

import Link from "next/link";
import { CheckCircle2, Clock, ShieldAlert } from "lucide-react";

// Shared post-submit "score only" screen — used by both Proctored
// Tests and Aptitude Test Mode. Score-only by design (no per-question
// reveal here, that's the review page, gated separately behind the
// teacher's release toggle). `auto_submitted_violation` never applies
// to Aptitude Test Mode (no proctoring), but including it here costs
// nothing and keeps one shared banner map instead of two near-copies.
const BANNERS: Record<string, { icon: typeof CheckCircle2; title: string; tone: string; message: string }> = {
  submitted: {
    icon: CheckCircle2,
    title: "Test submitted",
    tone: "text-success",
    message: "Your test has been submitted successfully.",
  },
  expired: {
    icon: Clock,
    title: "Time's up",
    tone: "text-warn",
    message: "The time limit was reached, so your test was auto-submitted with whatever you had answered.",
  },
  auto_submitted_violation: {
    icon: ShieldAlert,
    title: "Auto-submitted due to violations",
    tone: "text-red-400",
    message: "Your test hit the violation limit and was auto-submitted with whatever you had answered so far.",
  },
};

export default function TestResultBanner({
  status,
  score,
  total,
  backHref,
  backLabel,
}: {
  status: string;
  score: number | null;
  total: number | null;
  backHref: string;
  backLabel: string;
}) {
  const banner = BANNERS[status] ?? BANNERS.submitted;
  const Icon = banner.icon;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <Icon className={`h-10 w-10 ${banner.tone}`} />
      <h1 className="font-display text-2xl text-fg">{banner.title}</h1>
      <p className="text-sm text-fg-muted">{banner.message}</p>

      {score !== null && total !== null && (
        <p className="font-display text-4xl text-fg">
          You scored {score}/{total}
        </p>
      )}

      <p className="text-xs text-fg-subtle">
        A full answer review will be available here once your teacher releases results for this test.
      </p>

      <Link href={backHref} className="btn-secondary mt-4">
        {backLabel}
      </Link>
    </div>
  );
}
