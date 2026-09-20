"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Brain,
  ChevronLeft,
  ChevronRight,
  Code2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

// Hand-drawn mascot avatar — fixed colors regardless of light/dark
// theme (an illustration, not a themed UI surface), sized to fill
// whatever circular badge it's placed in.
function MascotFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Piku, your guide">
      <circle cx="50" cy="50" r="50" fill="#F6D9C4" />
      {/* hair back */}
      <path d="M12 46c0-24 17-38 38-38s38 14 38 38c0 6-1 11-3 15-3-10-9-16-17-16H32c-8 0-14 6-17 16-2-4-3-9-3-15z" fill="#5B3A29" />
      {/* buns */}
      <circle cx="14" cy="48" r="10" fill="#5B3A29" />
      <circle cx="86" cy="48" r="10" fill="#5B3A29" />
      {/* face */}
      <path d="M27 44c0-14 10-24 23-24s23 10 23 24v6c0 15-10 27-23 27s-23-12-23-27v-6z" fill="#FBE3CE" />
      {/* hair fringe */}
      <path d="M27 44c3-9 11-15 23-15s20 6 23 15c-2-3-6-5-11-5-4 0-6 2-12 2s-8-2-12-2c-5 0-9 2-11 5z" fill="#5B3A29" />
      {/* blush */}
      <circle cx="33" cy="58" r="4" fill="#F4A896" opacity="0.7" />
      <circle cx="67" cy="58" r="4" fill="#F4A896" opacity="0.7" />
      {/* eyes */}
      <circle cx="40" cy="52" r="3.2" fill="#3A2A20" />
      <circle cx="60" cy="52" r="3.2" fill="#3A2A20" />
      <circle cx="41.2" cy="50.8" r="1" fill="#fff" />
      <circle cx="61.2" cy="50.8" r="1" fill="#fff" />
      {/* smile */}
      <path d="M41 63c3 3 6 4.5 9 4.5s6-1.5 9-4.5" stroke="#B4654A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* bow */}
      <path d="M83 40l7-4v8z" fill="#D9824C" />
      <path d="M83 40l-7-4v8z" fill="#D9824C" />
      <circle cx="83" cy="40" r="2.5" fill="#B05C2A" />
    </svg>
  );
}

interface GuideStep {
  href: string;
  icon: typeof LayoutDashboard;
  title: string;
  text: string;
}

const STEPS: GuideStep[] = [
  {
    href: "/student/dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    text: "Your home base — track progress at a glance and catch new notifications up top.",
  },
  {
    href: "/student/dsa",
    icon: Code2,
    title: "DSA",
    text: "Practice curated problems from LeetCode, HackerRank, and more, checked off as you go.",
  },
  {
    href: "/student/aptitude",
    icon: Brain,
    title: "Aptitude",
    text: "Untimed practice by topic anytime, plus timed tests when your teacher assigns one.",
  },
  {
    href: "/student/proctored-tests",
    icon: ShieldCheck,
    title: "Proctored Tests",
    text: "Timed, monitored exams your teacher assigns — start when you're ready, in fullscreen.",
  },
  {
    href: "/student/classes",
    icon: Users,
    title: "My Classes",
    text: "See every class you've joined, grab a new one with a join code, or leave one.",
  },
  {
    href: "/student/study-material",
    icon: BookOpen,
    title: "Study Material",
    text: "DSA topic explainers, interview prep, and any files your teacher has uploaded.",
  },
];

// A small floating guide, mascot included, that walks a student
// through what each part of the site does — a lightweight substitute
// for a real onboarding tour, entirely client-side (no new API/DB).
export default function StudentGuide() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const Icon = current.icon;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="card w-72 space-y-3 p-4 shadow-lg sm:w-80">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-accent/30">
                <MascotFace className="h-full w-full" />
              </div>
              <div>
                <p className="text-sm font-medium text-fg">Piku</p>
                <p className="text-xs text-fg-subtle">Here to help you get around</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close guide"
              className="shrink-0 text-fg-subtle hover:text-fg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-lg border border-line/70 bg-surface-2 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-fg">
              <Icon className="h-4 w-4 text-accent" />
              {current.title}
            </div>
            <p className="mt-1.5 text-xs text-fg-muted">{current.text}</p>
            <Link
              href={current.href}
              onClick={() => setOpen(false)}
              className="mt-2 inline-block text-xs font-medium text-success hover:underline"
            >
              Take me there →
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1 + STEPS.length) % STEPS.length)}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            <div className="flex gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.href}
                  type="button"
                  onClick={() => setStep(i)}
                  aria-label={`Go to ${s.title} tip`}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === step ? "bg-accent" : "bg-line"}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) % STEPS.length)}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Piku, your guide" : "Open Piku, your guide"}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-line/70 bg-surface shadow-lg transition-transform hover:scale-105"
      >
        <MascotFace className="h-full w-full rounded-full" />
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink-fixed">
            <Sparkles className="h-3 w-3" />
          </span>
        )}
      </button>
    </div>
  );
}
