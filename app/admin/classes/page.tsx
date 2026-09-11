import Link from "next/link";
import { GraduationCap } from "lucide-react";

// Placeholder — a dedicated admin classes view (rename/delete/reassign
// ownership, etc.) is a follow-up task. For now, admins already have
// full access to the real "browse all classes" view built for
// teachers (they're authorized for every class via getClassAuthorization).
export default function AdminClassesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Classes</h1>
        <p className="mt-1 text-sm text-fg-muted">A dedicated admin view is coming soon.</p>
      </div>

      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <GraduationCap className="h-8 w-8 text-fg-subtle" />
        <p className="text-sm text-fg-muted">
          In the meantime, you can browse and manage every class in the system from the same view
          teachers use — you're already authorized for all of it.
        </p>
        <Link href="/teacher/classes" className="btn-secondary">
          Browse all classes
        </Link>
      </div>
    </div>
  );
}
