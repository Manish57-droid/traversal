import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAppUser } from "@/lib/roles";
import ThemeToggle from "@/components/ThemeToggle";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "approved") redirect("/pending-approval");

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4 sm:px-6">
          <Link href={`/${user.role}/dashboard`} className="text-sm text-fg-muted hover:text-fg">
            ← Back to dashboard
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl text-fg sm:text-3xl">Your profile</h1>
        <p className="mt-1 text-sm text-fg-muted">Update your name or change your password.</p>

        <div className="mt-6">
          <ProfileForm
            userId={user.id}
            email={user.email}
            fullName={user.full_name}
            role={user.role}
          />
        </div>
      </main>
    </div>
  );
}
