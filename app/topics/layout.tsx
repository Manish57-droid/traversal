import Link from "next/link";
import { getCurrentAppUser } from "@/lib/roles";
import Navbar from "@/components/Navbar";

// Topics are public — anyone can read the 3D explanations without an
// account, so unlike every other section this layout never redirects.
// If someone happens to be signed in and approved, the nav shows their
// normal role links too; otherwise it's just the logo + a Sign in link.
export default async function TopicsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  const role = user && user.status === "approved" ? user.role : undefined;

  return (
    <div className="min-h-screen bg-bg">
      <Navbar role={role} authed={!!user} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!user && (
          <Link
            href="/sign-up"
            className="card mb-6 flex flex-wrap items-center justify-between gap-3 border-accent/30 p-4 transition-colors hover:border-accent/60"
          >
            <p className="text-sm text-fg">
              Reading for free — <span className="text-fg">sign up</span> to get questions
              assigned by a teacher and track your own DSA progress.
            </p>
            <span className="btn-primary shrink-0 px-4 py-2 text-sm">Create free account</span>
          </Link>
        )}
        {children}
      </main>
    </div>
  );
}
