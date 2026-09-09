import Link from "next/link";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Platform",
    links: [
      { label: "Features", href: "#features" },
      { label: "Platforms", href: "#platforms" },
      { label: "How it works", href: "#how-it-works" },
    ],
  },
  {
    heading: "Get started",
    links: [
      { label: "Join as student", href: "/sign-up" },
      { label: "Start teaching", href: "/sign-up" },
      { label: "Login", href: "/sign-in" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-line/70 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <span className="font-display text-lg tracking-tight text-fg">traversal</span>
            <p className="mt-2 text-sm text-fg-muted">
              Placement prep and simulated drives, built for students and the colleges training them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-xs uppercase tracking-wide text-fg-subtle">{col.heading}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 border-t border-line/70 pt-6 text-xs text-fg-subtle">
          © {new Date().getFullYear()} Traversal. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
