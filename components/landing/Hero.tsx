import Link from "next/link";
import { CheckCircle2, CircleDot, Circle } from "lucide-react";

const DRIVE_ROUNDS = [
  { label: "Aptitude", status: "done" as const },
  { label: "Technical MCQ", status: "current" as const },
  { label: "Coding", status: "upcoming" as const },
  { label: "Results", status: "upcoming" as const },
];

function DrivePreviewCard() {
  return (
    <div className="card mx-auto w-full max-w-sm p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-fg-subtle">Simulated drive</p>
        <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-xs text-accent">
          Round 2 of 4
        </span>
      </div>
      <p className="mt-2 font-display text-lg text-fg">Full Stack SDE — Batch of 2026</p>

      <div className="mt-5 space-y-3">
        {DRIVE_ROUNDS.map((round) => (
          <div key={round.label} className="flex items-center gap-3">
            {round.status === "done" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
            {round.status === "current" && <CircleDot className="h-4 w-4 shrink-0 text-accent" />}
            {round.status === "upcoming" && <Circle className="h-4 w-4 shrink-0 text-fg-subtle" />}
            <span
              className={`text-sm ${
                round.status === "upcoming" ? "text-fg-subtle" : "text-fg"
              } ${round.status === "current" ? "font-medium" : ""}`}
            >
              {round.label}
            </span>
            {round.status === "current" && (
              <span className="ml-auto text-xs text-accent">In progress</span>
            )}
            {round.status === "done" && (
              <span className="ml-auto text-xs text-success">Cleared</span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full w-[42%] rounded-full bg-accent" />
      </div>
      <p className="mt-2 text-xs text-fg-subtle">Timed rounds, pass/fail gating — just like the real thing.</p>
    </div>
  );
}

export default function Hero({ userId }: { userId?: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-fade" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-8 lg:py-28">
        <div>
          <h1 className="font-display text-4xl leading-[1.1] text-fg sm:text-5xl lg:text-6xl">
            Placement prep, practiced <span className="italic text-accent">like the real thing.</span>
          </h1>
          <p className="mt-6 max-w-md text-base text-fg-muted sm:text-lg">
            Aptitude, technical rounds, and DSA practice in one place — plus a live board of
            off-campus opportunities and simulated company drives that run just like a real
            recruitment process. For students prepping solo, and for colleges tracking a whole
            batch.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {userId ? (
              <Link href="/dashboard" className="btn-primary">Continue where you left off</Link>
            ) : (
              <>
                <Link href="/sign-up" className="btn-primary">Join as Student</Link>
                <Link href="/sign-up" className="btn-secondary">Start Teaching</Link>
              </>
            )}
          </div>
        </div>

        <DrivePreviewCard />
      </div>
    </section>
  );
}
