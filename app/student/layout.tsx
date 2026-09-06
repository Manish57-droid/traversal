import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";
import Navbar from "@/components/Navbar";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "approved") redirect("/pending-approval");
  // Teachers/admins are welcome to preview a student view later, but
  // for now keep the roles cleanly separated.
  if (user.role !== "student") redirect(`/${user.role}/dashboard`);

  return (
    <div className="min-h-screen bg-ink">
      <Navbar role="student" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
