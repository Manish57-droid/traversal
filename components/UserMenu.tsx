"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser-client";

// Avatar + name with a dropdown for signing out — shared by
// TeacherNavbar and StudentNavbar so the interaction (and the sign-out
// call itself) only lives in one place.
export default function UserMenu({ name, email }: { name: string; email: string }) {
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
        <ChevronDown className={`h-3.5 w-3.5 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="card absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden p-1">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-fg">{name || "—"}</p>
            <p className="truncate text-xs text-fg-muted">{email}</p>
          </div>
          <div className="border-t border-line/70" />
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
