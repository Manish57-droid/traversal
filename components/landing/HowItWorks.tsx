"use client";

import { useState } from "react";

const TEACHER_STEPS = [
  {
    title: "Build your classroom",
    description: "Create a class, drop the join code — students enroll themselves. No roster spreadsheet required.",
  },
  {
    title: "Assign across every module",
    description: "Send a DSA set, an aptitude test, or a full simulated drive to the whole class — in one shot.",
  },
  {
    title: "Track performance",
    description: "One rollup, every student — who's on track, who's stuck, who's ready for the next round.",
  },
];

const STUDENT_STEPS = [
  {
    title: "Join your class",
    description: "Drop in the code your teacher shares — everything they assign lands automatically.",
  },
  {
    title: "Practice at your own pace",
    description: "DSA, aptitude, technical — work through it your way, progress tracked as you go.",
  },
  {
    title: "Run the drive",
    description: "Take the timed, multi-round drive and find out exactly where you'd stand for real.",
  },
];

export default function HowItWorks() {
  const [tab, setTab] = useState<"teachers" | "students">("students");
  const steps = tab === "students" ? STUDENT_STEPS : TEACHER_STEPS;

  return (
    <section id="how-it-works" className="scroll-mt-20 border-t border-line/70 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl text-fg sm:text-4xl">How you'd actually use it</h2>
          <p className="mt-4 text-base text-fg-muted">Same platform, built for two very different jobs.</p>
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
