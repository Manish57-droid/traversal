import { SiCodechef, SiCodeforces, SiGeeksforgeeks, SiHackerrank, SiLeetcode } from "react-icons/si";
import type { IconType } from "react-icons";

const PLATFORMS: { name: string; icon: IconType; color: string; note: string }[] = [
  { name: "LeetCode", icon: SiLeetcode, color: "#FFA116", note: "The default for interview-style problems" },
  { name: "CodeChef", icon: SiCodechef, color: "#5B4638", note: "Rated contests and long-format challenges" },
  { name: "Codeforces", icon: SiCodeforces, color: "#1F8ACB", note: "Competitive programming rounds and rating" },
  { name: "GeeksforGeeks", icon: SiGeeksforgeeks, color: "#2F8D46", note: "Concept-first practice by topic" },
  { name: "HackerRank", icon: SiHackerrank, color: "#00EA64", note: "Structured tracks and certification tests" },
];

export default function Platforms() {
  return (
    <section id="platforms" className="scroll-mt-20 border-t border-line/70 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl text-fg sm:text-4xl">
            Integrated with the platforms students already use
          </h2>
          <p className="mt-4 text-base text-fg-muted">
            Solve wherever the problem lives — Traversal detects the platform from the link and
            tracks the checkbox, no separate editor to learn.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLATFORMS.map((p) => (
            <div key={p.name} className="card p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-2">
                <p.icon className="h-5 w-5" color={p.color} />
              </div>
              <p className="mt-3 font-display text-base text-fg">{p.name}</p>
              <p className="mt-1 text-xs text-fg-muted">{p.note}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-fg-subtle">
          Practice problems across LeetCode, CodeChef, Codeforces, GfG &amp; HackerRank — assigned
          by your teacher or found on your own.
        </p>
      </div>
    </section>
  );
}
