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

export default function Navbar({ role }: { role?: UserRole }) {
  const router = useRouter();
  const homeHref = role ? `/${role}/dashboard` : "/";

  async function handleSignOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={homeHref} className="font-display text-lg tracking-tight text-white">
          traversal
        </Link>

        {role && (
          <nav className="hidden items-center gap-6 text-sm text-slate-300 sm:flex">
            {role === "student" && (
              <>
                <Link href="/student/dashboard" className="hover:text-white">Dashboard</Link>
                <Link href="/student/dsa" className="hover:text-white">DSA Sheet</Link>
                <Link href="/topics" className="hover:text-white">Topics</Link>
              </>
            )}
            {role === "teacher" && (
              <>
                <Link href="/teacher/dashboard" className="hover:text-white">Class progress</Link>
                <Link href="/teacher/questions" className="hover:text-white">Question bank</Link>
                <Link href="/teacher/question-sets" className="hover:text-white">Question sets</Link>
                <Link href="/teacher/assign" className="hover:text-white">Assign</Link>
                <Link href="/topics" className="hover:text-white">Topics</Link>
              </>
            )}
            {role === "admin" && (
              <>
                <Link href="/admin/dashboard" className="hover:text-white">Overview</Link>
                <Link href="/admin/users" className="hover:text-white">Users</Link>
                <Link href="/teacher/dashboard" className="hover:text-white">Class progress</Link>
                <Link href="/teacher/question-sets" className="hover:text-white">Question sets</Link>
                <Link href="/topics" className="hover:text-white">Topics</Link>
              </>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {role && (
            <span className="hidden rounded-full border border-white/10 px-2.5 py-1 text-xs text-slate-400 sm:inline">
              {ROLE_LABEL[role]}
            </span>
          )}
          {role && (
            <button onClick={handleSignOut} className="btn-secondary py-1.5 text-xs">
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
