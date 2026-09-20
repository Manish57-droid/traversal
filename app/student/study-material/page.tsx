"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Download, MessagesSquare } from "lucide-react";
import FolderSection from "@/components/FolderSection";
import type { ClassMaterial } from "@/types";

interface StudentClassRow {
  id: string;
  name: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The student nav's "Study Material" entry — a small hub in front of
// two pages that already existed on their own routes: DSA Topics
// (/topics, public — also reachable from the landing/teacher navbars,
// left untouched) and Interview Prep (/student/interview-prep, was
// its own top-level nav item). Folding Interview Prep in here just
// removes its separate nav entry; the page itself didn't move. Below
// those, class materials a teacher uploads (see ClassMaterialsPanel on
// the teacher dashboard) show up per class the student has joined.
const SECTIONS = [
  {
    href: "/topics",
    icon: BookOpen,
    title: "DSA Topics",
    description: "Step through each concept in 3D — play it end to end, or scrub through at your own pace.",
  },
  {
    href: "/student/interview-prep",
    icon: MessagesSquare,
    title: "Interview Prep",
    description: "Common interview questions and answers, organized by language and topic.",
  },
];

export default function StudyMaterialPage() {
  const [classes, setClasses] = useState<StudentClassRow[]>([]);
  const [materialsByClass, setMaterialsByClass] = useState<Record<string, ClassMaterial[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/classes")
      .then((r) => r.json())
      .then(async (d) => {
        const fetched: StudentClassRow[] = d.classes ?? [];
        setClasses(fetched);
        const entries = await Promise.all(
          fetched.map(async (c) => {
            const r = await fetch(`/api/classes/${c.id}/materials`);
            const md = await r.json();
            return [c.id, (md.materials ?? []) as ClassMaterial[]] as const;
          })
        );
        setMaterialsByClass(Object.fromEntries(entries));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Study material</h1>
        <p className="mt-1 text-sm text-fg-muted">Reference content to review alongside the practice sheets.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="card block p-5 transition-colors hover:border-line">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <s.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 font-display text-xl text-fg">{s.title}</p>
            <p className="mt-2 text-sm text-fg-muted">{s.description}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-fg">Class materials</h2>
        {loading && <p className="text-sm text-fg-muted">Loading…</p>}
        {!loading && classes.length === 0 && (
          <p className="card p-6 text-center text-sm text-fg-muted">
            Join a class from <Link href="/student/classes" className="text-success hover:underline">My Classes</Link> to see anything your teacher uploads here.
          </p>
        )}
        <div className="space-y-2">
          {classes.map((c) => {
            const materials = materialsByClass[c.id] ?? [];
            return (
              <FolderSection key={c.id} label={c.name} count={materials.length} unit="document">
                {materials.length === 0 && (
                  <p className="text-xs text-fg-subtle">Your teacher hasn't uploaded anything here yet.</p>
                )}
                {materials.map((m) => (
                  <a
                    key={m.id}
                    href={m.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border border-line/70 px-3 py-2 text-sm transition-colors hover:border-line"
                  >
                    <span className="min-w-0 truncate text-fg">{m.title}</span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-fg-subtle">
                      {formatBytes(m.file_size)}
                      <Download className="h-3.5 w-3.5" />
                    </span>
                  </a>
                ))}
              </FolderSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
