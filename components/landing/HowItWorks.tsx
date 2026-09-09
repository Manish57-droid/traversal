"use client";

import { useState } from "react";

const TEACHER_STEPS = [
  {
    title: "Build your classroom",
    description: "Create a class and share the join code — students enroll themselves, no roster upload needed.",
  },
  {
    title: "Assign across every module",
    description: "Send a DSA question set, an aptitude test, or a full simulated drive to the whole class at once.",
  },
  {
    title: "Track performance",
    description: "See a per-student, per-class rollup — who's completed what, who's stuck, who's ready for the next round.",
  },
];

const STUDENT_STEPS = [
  {
    title: "Join your class",
    description: "Enter the code your teacher shares to get everything they assign you, automatically.",
  },
  {
    title: "Practice at your own pace",
    description: "Work through DSA, aptitude, and technical questions — checkmarks and correctness tracked as you go.",
  },
  {
    title: "Run the drive",
    description: "Take a timed, multi-round simulated drive and see exactly where you'd stand in the real process.",
  },
];

export default function HowItWorks() {
  const [tab, setTab] = useState<"teachers" | "students">("students");
  const steps = tab === "students" ? STUDENT_STEPS : TEACHER_STEPS;

  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-line/70 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl text-fg sm:text-4xl">How it works</h2>
          <p className="mt-4 text-base text-fg-muted">The same platform, two different workflows.</p>
        </div>

        <div className="mt-8 inline-flex rounded-full border border-line p-1">
          {(["students", "teachers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
                tab === t ? "bg-accent text-ink-fixed" : "text-fg-muted hover:text-fg"
              }`}
            >
              For {t}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="card p-5">
              <span className="font-display text-2xl text-accent">{String(i + 1).padStart(2, "0")}</span>
              <p className="mt-3 font-display text-lg text-fg">{step.title}</p>
              <p className="mt-2 text-sm text-fg-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
