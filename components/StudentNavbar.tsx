"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import type { UserRole } from "@/types";

const NAV_LINKS = [
  { href: "/student/dashboard", label: "Dashboard" },
  { href: "/student/dsa", label: "DSA" },
  { href: "/student/aptitude", label: "Aptitude" },
  { href: "/student/interview-prep", label: "Interview Prep" },
  { href: "/student/proctored-tests", label: "Proctored Tests" },
  { href: "/student/classes", label: "My Classes" },
  { href: "/topics", label: "Topics" },
];

export default function StudentNavbar({ user }: { user: { full_name: string | null; email: string; role: UserRole } }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/student/dashboard" className="font-display text-lg tracking-tight text-fg">
          traversal
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors hover:text-fg ${
                pathname.startsWith(link.href) ? "text-fg" : "text-fg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          <UserMenu name={user.full_name ?? ""} email={user.email} role={user.role} />
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg-muted"
          >
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line/70 bg-bg px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`py-1 transition-colors hover:text-fg ${
                  pathname.startsWith(link.href) ? "text-fg" : "text-fg-muted"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-4">
            <UserMenu name={user.full_name ?? ""} email={user.email} role={user.role} />
          </div>
        </div>
      )}
    </header>
  );
}
