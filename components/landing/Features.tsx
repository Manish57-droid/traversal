import { Binary, Calculator, Cpu, Briefcase, Flag, LineChart, type LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Binary,
    title: "DSA Practice & Tracking",
    description:
      "Solve problems from LeetCode, CodeChef, Codeforces, GfG, and HackerRank. Teachers assign, students check off, progress builds up automatically.",
  },
  {
    icon: Calculator,
    title: "Aptitude Practice",
    description:
      "Quant, logical, and verbal MCQs organized by topic, with instant feedback and explanations — plus timed, teacher-assigned tests.",
  },
  {
    icon: Cpu,
    title: "Technical Round Practice",
    description:
      "CS fundamentals and technical MCQs to get interview-ready, alongside the DSA and aptitude tracks you're already building progress in.",
  },
  {
    icon: Briefcase,
    title: "Off-Campus Opportunities",
    description:
      "A curated board of internships and jobs beyond your campus drive, with filters and application tracking in one place.",
  },
  {
    icon: Flag,
    title: "Simulated Placement Drives",
    description:
      "Multi-round, timed drives that mirror a real recruitment process — aptitude, technical, coding, and results, with pass/fail gating between rounds.",
  },
  {
    icon: LineChart,
    title: "Classroom & Progress Analytics",
    description:
      "Teachers assign across every module and see per-student, per-class rollups — who's on track, and who needs a nudge.",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-line/70 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl text-fg sm:text-4xl">Everything placement prep needs, in one place</h2>
          <p className="mt-4 text-base text-fg-muted">
            Traversal isn't just a DSA sheet — it's practice, opportunities, and simulated drives,
            built around how recruitment actually works.
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
