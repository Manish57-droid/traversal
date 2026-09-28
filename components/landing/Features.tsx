import { Binary, Calculator, Cpu, Briefcase, Flag, LineChart, type LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Binary,
    title: "DSA Practice & Tracking",
    description:
      "LeetCode, CodeChef, Codeforces, GfG, HackerRank — assigned by your teacher, tracked automatically the moment you check it off.",
  },
  {
    icon: Calculator,
    title: "Aptitude Practice",
    description:
      "Quant, logical, and verbal MCQs by topic, with instant feedback that actually explains itself — plus timed tests your teacher assigns.",
  },
  {
    icon: Cpu,
    title: "Technical Round Practice",
    description:
      "CS fundamentals and technical MCQs that get you interview-ready, not just quiz-ready.",
  },
  {
    icon: Briefcase,
    title: "Off-Campus Opportunities",
    description:
      "Internships and jobs beyond your campus drive — filtered, tracked, and in one board instead of six browser tabs.",
  },
  {
    icon: Flag,
    title: "Simulated Placement Drives",
    description:
      "Timed, multi-round drives that mirror the real thing — aptitude, technical, coding, results, pass/fail gating and all.",
  },
  {
    icon: LineChart,
    title: "Classroom & Progress Analytics",
    description:
      "One rollup per class, per student — who's crushing it, who needs a nudge, at a glance.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-line/70 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl text-fg sm:text-4xl">Everything placement season throws at you — in one place</h2>
          <p className="mt-4 text-base text-fg-muted">
            Not just another DSA sheet. Practice, opportunities, and simulated drives — built
            around how hiring actually works.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-lg text-fg">{title}</p>
              <p className="mt-2 text-sm text-fg-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
