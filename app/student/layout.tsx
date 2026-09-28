import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";
import StudentNavbar from "@/components/StudentNavbar";
import StudentFooter from "@/components/StudentFooter";
import StudentGuide from "@/components/StudentGuide";
import WelcomeInterviewPrepTip from "@/components/WelcomeInterviewPrepTip";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status !== "approved") redirect("/pending-approval");
  // Teachers/admins are welcome to preview a student view later, but
  // for now keep the roles cleanly separated.
  if (user.role !== "student") redirect(`/${user.role}/dashboard`);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <StudentNavbar user={{ full_name: user.full_name, email: user.email, role: user.role }} />
      {/* flex-1 so the footer sits at the bottom of the viewport on a
          short page instead of floating right under sparse content. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <WelcomeInterviewPrepTip />
        {children}
      </main>
      <StudentFooter />
      {/* Site-wide, not just the dashboard — "guide through the
          website" means every student page, not one of them. */}
      <StudentGuide />
    </div>
  );
}
