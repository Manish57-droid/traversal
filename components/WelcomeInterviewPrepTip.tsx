"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, X } from "lucide-react";

// One-time nudge for a newly-signed-up student toward Interview Prep,
// shown site-wide (mounted in app/student/layout.tsx, above whatever
// page they land on) rather than dashboard-only, since a new student
// might land anywhere first. `interview_prep_tip_seen` (see
// supabase/migrations/0023_interview_prep_welcome_tip.sql) is scoped
// to genuinely new accounts — existing students were backfilled to
// "already seen" so this doesn't suddenly nag everyone. Only marked
// seen on an explicit dismiss or click-through, not just on display,
// so a quick reload before they've read it doesn't make it vanish.
export default function WelcomeInterviewPrepTip() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/student/welcome-tip")
      .then((r) => r.json())
      .then((d) => setShow(d.seen === false))
      .catch(() => {});
  }, []);

  function dismiss() {
    setShow(false);
    fetch("/api/student/welcome-tip", { method: "PATCH" }).catch(() => {});
  }

  // Same distraction-free exclusion as StudentGuide — a promo banner
  // has no place on a monitored, fullscreen exam screen.
  if (pathname.includes("/proctored-tests/") && pathname.endsWith("/take")) return null;
  if (!show) return null;

  return (
    <div className="card mb-6 flex flex-wrap items-center gap-3 border-accent/40 bg-accent/5 p-4">
      <Sparkles className="h-5 w-5 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg">
          Welcome to Traversal! Want a quick revision on any topic before an interview?
        </p>
        <p className="mt-0.5 text-xs text-fg-muted">
          Head to <span className="font-medium text-fg">Interview Preparation</span> — short, focused explanations for
          the topics that come up most.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link href="/student/interview-prep" onClick={dismiss} className="btn-primary py-1.5 text-xs">
          Take me there
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 text-fg-subtle hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
