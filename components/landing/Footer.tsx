import Link from "next/link";

const DEVELOPER_PORTFOLIO_URL = "https://manish-portfolio-smoky.vercel.app/";

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
  {
    heading: "About",
    links: [{ label: "Meet the developer", href: DEVELOPER_PORTFOLIO_URL }],
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

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 sm:gap-12">
            {COLUMNS.map((col) => (
              <div key={col.heading}>
                <p className="text-xs uppercase tracking-wide text-fg-subtle">{col.heading}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => {
                    const isExternal = link.href.startsWith("http");
                    return (
                      <li key={link.label}>
                        {isExternal ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-fg-muted transition-colors hover:text-fg"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link href={link.href} className="text-sm text-fg-muted transition-colors hover:text-fg">
                            {link.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
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
