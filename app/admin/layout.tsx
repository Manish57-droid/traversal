import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "approved") redirect("/pending-approval");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg">
      <AdminSidebar user={{ full_name: user.full_name, email: user.email }} />
      <div className="md:ml-16 lg:ml-60">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
