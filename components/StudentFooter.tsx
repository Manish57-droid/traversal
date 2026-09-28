import Image from "next/image";
import Link from "next/link";
import { Mail } from "lucide-react";

// lucide-react dropped brand icons a while back, so Instagram's glyph
// is inlined here rather than pulled from the icon set — same
// h-3.5 w-3.5 sizing as the Mail icon next to it, for visual parity.
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

const DEVELOPER_PORTFOLIO_URL = "https://manish-portfolio-smoky.vercel.app/";
const CONTACT_EMAIL = "traversalofficial@gmail.com";
const INSTAGRAM_HANDLE = "traversal_official";
const INSTAGRAM_URL = `https://instagram.com/${INSTAGRAM_HANDLE}`;

const EXPLORE_LINKS = [
  { label: "Dashboard", href: "/student/dashboard" },
  { label: "DSA", href: "/student/dsa" },
  { label: "Aptitude", href: "/student/aptitude" },
  { label: "Proctored Tests", href: "/student/proctored-tests" },
  { label: "My Classes", href: "/student/classes" },
  { label: "Study Material", href: "/student/study-material" },
];

export default function StudentFooter() {
  return (
    <footer className="border-t border-line/70 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-2">
              <Image src="/logo-mark.png" alt="" width={28} height={28} className="rounded-full" />
              <span className="font-display text-lg tracking-tight text-fg">traversal</span>
            </div>
            <p className="mt-2 text-sm text-fg-muted">
              Everything you need to practice, prepare, and get placed — in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-12">
            <div>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">Explore</p>
              <ul className="mt-3 space-y-2">
                {EXPLORE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">Connect</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all">{CONTACT_EMAIL}</span>
                  </a>
                </li>
                <li>
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    <InstagramIcon className="h-3.5 w-3.5 shrink-0" /> @{INSTAGRAM_HANDLE}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-fg-subtle">About</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <a
                    href={DEVELOPER_PORTFOLIO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-fg-muted transition-colors hover:text-fg"
                  >
                    Meet the developer
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-6 text-xs text-fg-subtle">
          <span>© {new Date().getFullYear()} Traversal. All rights reserved.</span>
          <a
            href={DEVELOPER_PORTFOLIO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-fg"
          >
            Built by Manish Kushwaha ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
