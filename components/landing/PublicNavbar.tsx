"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#platforms", label: "Platforms" },
  { href: "#how-it-works", label: "How it works" },
];

export default function PublicNavbar({ userId }: { userId?: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-lg tracking-tight text-fg">
          traversal
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-fg-muted md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-fg">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {userId ? (
            <Link href="/dashboard" className="btn-secondary py-2 text-sm">Go to dashboard</Link>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm text-fg-muted hover:text-fg">Login</Link>
              <Link href="/sign-up" className="btn-primary py-2 text-sm">Get Started</Link>
            </>
          )}
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
          <nav className="flex flex-col gap-3 text-sm text-fg-muted">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-1 transition-colors hover:text-fg"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-line/70 pt-4">
            {userId ? (
              <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="btn-secondary justify-center">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/sign-in" onClick={() => setMenuOpen(false)} className="btn-secondary justify-center">
                  Login
                </Link>
                <Link href="/sign-up" onClick={() => setMenuOpen(false)} className="btn-primary justify-center">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
