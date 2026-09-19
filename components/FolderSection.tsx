"use client";

import { useState } from "react";
import { ChevronDown, Folder, FolderOpen } from "lucide-react";

// Shared collapsible "folder" wrapper for the three teacher question
// banks (DSA topics, Aptitude category/topic, Proctored subject/set) —
// one visual language for "questions organized into folders" across
// all of them instead of three bespoke implementations.
export default function FolderSection({
  label,
  count,
  defaultOpen = false,
  variant = "default",
  depth = 0,
  actions,
  children,
}: {
  label: string;
  count: number;
  defaultOpen?: boolean;
  /** "uncategorized" gets warn-colored styling so it reads as a place
   * that needs attention, not just another folder. */
  variant?: "default" | "uncategorized";
  /** 1 = nested one level in (e.g. a Set folder inside a Subject) —
   * indents and uses a slightly smaller/muted heading. */
  depth?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const uncategorized = variant === "uncategorized";

  return (
    <div
      className={`rounded-lg border ${uncategorized ? "border-warn/40" : "border-line/70"}`}
      style={depth ? { marginLeft: depth * 16 } : undefined}
    >
      <div className="flex items-center justify-between gap-2 pr-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2 p-3 text-left"
        >
          {open ? (
            <FolderOpen className={`h-4 w-4 shrink-0 ${uncategorized ? "text-warn" : "text-accent"}`} />
          ) : (
            <Folder className={`h-4 w-4 shrink-0 ${uncategorized ? "text-warn" : "text-accent"}`} />
          )}
          <span className={`text-sm font-medium ${uncategorized ? "text-warn" : "text-fg"} ${depth ? "text-xs" : ""}`}>
            {label}
          </span>
          <span className="text-xs text-fg-subtle">
            {count} question{count === 1 ? "" : "s"}
          </span>
          <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-fg-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {actions && <div className="shrink-0" onClick={(e) => e.stopPropagation()}>{actions}</div>}
      </div>
      {open && <div className="space-y-2 border-t border-line/70 p-3">{children}</div>}
    </div>
  );
}
