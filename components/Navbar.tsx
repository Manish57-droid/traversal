"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import type { UserRole } from "@/types";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};

export default function Navbar({ role, authed = true }: { role?: UserRole; authed?: boolean }) {
  const router = useRouter();
  const homeHref = role ? `/${role}/dashboard` : "/";

  async function handleSignOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={homeHref} className="font-display text-lg tracking-tight text-fg">
          traversal
        </Link>

        {role && (
          <nav className="hidden items-center gap-6 text-sm text-fg sm:flex">
            {role === "student" && (
              <>
                <Link href="/student/dashboard" className="hover:text-fg">Dashboard</Link>
                <Link href="/student/dsa" className="hover:text-fg">DSA Sheet</Link>
                <Link href="/student/aptitude" className="hover:text-fg">Aptitude</Link>
                <Link href="/topics" className="hover:text-fg">Topics</Link>
              </>
            )}
            {role === "teacher" && (
              <>
                <Link href="/teacher/dashboard" className="hover:text-fg">Class progress</Link>
                <Link href="/teacher/questions" className="hover:text-fg">Question bank</Link>
                <Link href="/teacher/question-sets" className="hover:text-fg">Question sets</Link>
                <Link href="/teacher/assign" className="hover:text-fg">Assign</Link>
                <Link href="/teacher/aptitude/questions" className="hover:text-fg">Aptitude bank</Link>
                <Link href="/topics" className="hover:text-fg">Topics</Link>
              </>
            )}
            {role === "admin" && (
              <>
                <Link href="/admin/dashboard" className="hover:text-fg">Overview</Link>
                <Link href="/admin/users" className="hover:text-fg">Users</Link>
                <Link href="/teacher/dashboard" className="hover:text-fg">Class progress</Link>
                <Link href="/teacher/question-sets" className="hover:text-fg">Question sets</Link>
                <Link href="/topics" className="hover:text-fg">Topics</Link>
              </>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {role && (
            <span className="hidden rounded-full border border-line/70 px-2.5 py-1 text-xs text-fg-muted sm:inline">
              {ROLE_LABEL[role]}
            </span>
          )}
          {authed ? (
            <button onClick={handleSignOut} className="btn-secondary py-1.5 text-xs">
              Sign out
            </button>
          ) : (
            <Link href="/sign-in" className="btn-secondary py-1.5 text-xs">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
