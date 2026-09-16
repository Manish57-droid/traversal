"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import RoleBadge from "@/components/RoleBadge";
import type { UserRole } from "@/types";

// Avatar + name with a dropdown for signing out — shared by
// TeacherNavbar/StudentNavbar (top navbar, dropdown opens downward)
// and AdminSidebar (bottom of a sidebar, dropdown opens upward via
// `placement="top"` so it doesn't clip off the bottom of the viewport).
// `role`, when passed, renders a small badge next to the name — the
// one shared place this shows up, rather than three separate navbar
// implementations each adding their own.
export default function UserMenu({
  name,
  email,
  role,
  placement = "bottom",
}: {
  name: string;
  email: string;
  role?: UserRole;
  placement?: "top" | "bottom";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const initial = (name || email || "?").trim()[0]?.toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-2.5 text-sm text-fg
          transition-colors hover:border-accent/50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-ink-fixed">
          {initial}
        </span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{name || email}</span>
        {role && <span className="hidden sm:inline"><RoleBadge role={role} /></span>}
        <ChevronDown className={`h-3.5 w-3.5 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className={`card absolute right-0 z-50 w-56 overflow-hidden p-1 ${
            placement === "top" ? "bottom-full left-0 right-auto mb-2" : "top-full mt-2"
          }`}
        >
          <div className="px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-fg">{name || "—"}</p>
              {role && <RoleBadge role={role} />}
            </div>
            <p className="truncate text-xs text-fg-muted">{email}</p>
          </div>
          <div className="border-t border-line/70" />
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg-muted
              transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg-muted
              transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
