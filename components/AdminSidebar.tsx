"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, History, Inbox, LayoutDashboard, Menu, Users, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/UserMenu";
import type { UserRole } from "@/types";

const NAV_LINKS = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/classes", label: "Classes", icon: GraduationCap },
  { href: "/admin/access-requests", label: "Access Requests", icon: Inbox },
  { href: "/admin/role-log", label: "Role Log", icon: History },
];

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: typeof Users;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={label}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors md:justify-center lg:justify-start ${
        active ? "bg-accent/10 text-accent" : "text-fg-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="md:hidden lg:inline">{label}</span>
    </Link>
  );
}

export default function AdminSidebar({ user }: { user: { full_name: string | null; email: string; role: UserRole } }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const nav = (onLinkClick?: () => void) => (
    <nav className="flex flex-1 flex-col gap-1 px-2">
      {NAV_LINKS.map((link) => (
        <NavItem
          key={link.href}
          href={link.href}
          label={link.label}
          icon={link.icon}
          active={pathname === link.href || pathname.startsWith(link.href + "/")}
          onClick={onLinkClick}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop / tablet sidebar — icon rail on md, full width on lg+ */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col border-r border-line/70 bg-bg py-4 md:flex lg:w-60">
        <Link href="/admin/dashboard" className="mb-4 flex items-center justify-center px-3 lg:justify-start">
          <span className="hidden font-display text-lg tracking-tight text-fg lg:inline">traversal</span>
          <span className="font-display text-lg tracking-tight text-fg lg:hidden">t</span>
        </Link>

        {nav()}

        <div className="mt-auto flex flex-col items-center gap-3 border-t border-line/70 px-2 pt-4 lg:items-stretch">
          <div className="flex justify-center lg:justify-start">
            <ThemeToggle />
          </div>
          <div className="flex justify-center lg:justify-start">
            <UserMenu name={user.full_name ?? ""} email={user.email} role={user.role} placement="top" />
          </div>
        </div>
      </aside>

      {/* Mobile top bar + slide-out drawer */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line/70 bg-bg/80 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/admin/dashboard" className="font-display text-lg tracking-tight text-fg">
          traversal
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            onClick={() => setDrawerOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg-muted"
          >
            {drawerOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-bg/60 backdrop-blur-sm" />
          <div
            className="relative flex h-full w-64 flex-col border-r border-line bg-bg py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between px-3">
              <span className="font-display text-lg tracking-tight text-fg">traversal</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-fg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav(() => setDrawerOpen(false))}
            <div className="mt-auto border-t border-line/70 px-3 pt-4">
              <UserMenu name={user.full_name ?? ""} email={user.email} role={user.role} placement="top" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
