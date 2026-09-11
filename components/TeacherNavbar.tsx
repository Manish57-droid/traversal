"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Binary, BookOpen, Calculator, ChevronDown, Compass, ListChecks, MessagesSquare, Menu, Send, ShieldCheck, Users, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import type { UserRole } from "@/types";

// "Classes" links to /teacher/dashboard — today that one page handles
// both creating/managing classes and the per-student progress rollup,
// there's no separate analytics route yet, so there's deliberately no
// second "Dashboard" item pointing at the same URL. Split this into
// two links once that page exists as its own route.
const CLASSES_LINK = { href: "/teacher/dashboard", label: "Classes", icon: Users };
const BROWSE_LINK = { href: "/teacher/classes", label: "Browse", icon: Compass };
const ASSIGN_LINK = { href: "/teacher/assign", label: "Assign", icon: Send };

// Grouped under the "Content" dropdown — same icons Features.tsx uses
// on the landing page for these same concepts, so the iconography
// reads consistently across the app.
const CONTENT_LINKS = [
  { href: "/teacher/question-sets", label: "Question sets", icon: ListChecks },
  { href: "/teacher/questions", label: "DSA Questions", icon: Binary },
  { href: "/teacher/aptitude/questions", label: "Aptitude Questions", icon: Calculator },
  { href: "/teacher/interview-prep", label: "Interview Prep", icon: MessagesSquare },
  { href: "/teacher/proctored-questions", label: "Proctored Questions", icon: ShieldCheck },
];

function NavPill({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Users; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ContentDropdown({ active, pathname }: { active: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
          active ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg"
        }`}
      >
        <BookOpen className="h-4 w-4" />
        Content
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="card absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden p-1">
          {CONTENT_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-accent/10 text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
                }`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TeacherNavbar({ user }: { user: { full_name: string | null; email: string; role: UserRole } }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  const contentActive = CONTENT_LINKS.some((l) => pathname === l.href);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/teacher/dashboard" className="font-display text-lg tracking-tight text-fg">
          traversal
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          <NavPill {...CLASSES_LINK} active={pathname === CLASSES_LINK.href} />
          <NavPill {...BROWSE_LINK} active={pathname === BROWSE_LINK.href} />
          <ContentDropdown active={contentActive} pathname={pathname} />
          <NavPill {...ASSIGN_LINK} active={pathname === ASSIGN_LINK.href} />
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />
          <UserMenu name={user.full_name ?? ""} email={user.email} role={user.role} />
        </div>

        <div className="flex items-center gap-2 lg:hidden">
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
        <div className="border-t border-line/70 bg-bg px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1 text-sm">
            <Link
              href={CLASSES_LINK.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
                pathname === CLASSES_LINK.href ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg"
              }`}
            >
              <Users className="h-4 w-4" />
              {CLASSES_LINK.label}
            </Link>

            <Link
              href={BROWSE_LINK.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
                pathname === BROWSE_LINK.href ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg"
              }`}
            >
              <Compass className="h-4 w-4" />
              {BROWSE_LINK.label}
            </Link>

            <button
              type="button"
              onClick={() => setContentExpanded((v) => !v)}
              className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                contentActive ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg"
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Content
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${contentExpanded ? "rotate-180" : ""}`} />
            </button>
            {contentExpanded && (
              <div className="ml-4 flex flex-col gap-1 border-l border-line/70 pl-3">
                {CONTENT_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
                        isActive ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg"
                      }`}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}

            <Link
              href={ASSIGN_LINK.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-2 rounded-lg px-2 py-2 transition-colors ${
                pathname === ASSIGN_LINK.href ? "bg-accent/10 text-accent" : "text-fg-muted hover:text-fg"
              }`}
            >
              <Send className="h-4 w-4" />
              {ASSIGN_LINK.label}
            </Link>
          </nav>
          <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-4">
            <UserMenu name={user.full_name ?? ""} email={user.email} role={user.role} />
          </div>
        </div>
      )}
    </header>
  );
}
