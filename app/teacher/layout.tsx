import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";
import TeacherNavbar from "@/components/TeacherNavbar";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "approved") redirect("/pending-approval");
  if (user.role !== "teacher" && user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg">
      <TeacherNavbar user={{ full_name: user.full_name, email: user.email, role: user.role }} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
