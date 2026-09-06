import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";
import Navbar from "@/components/Navbar";

// Topics are readable by every role — student, teacher, and admin all
// use the same 3D explanations, so this layout only checks that
// someone is signed in, not which role they have.
export default async function TopicsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "approved") redirect("/pending-approval");

  return (
    <div className="min-h-screen bg-ink">
      <Navbar role={user.role} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
