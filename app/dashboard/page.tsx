import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";

// Single entry point after sign-in — routes each role to its home.
export default async function DashboardRouter() {
  const user = await getCurrentAppUser();

  if (!user) redirect("/sign-in");
  if (user.status !== "approved") redirect("/pending-approval");
  redirect(`/${user.role}/dashboard`);
}
