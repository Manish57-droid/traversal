import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";
import Navbar from "@/components/Navbar";

export default async function PendingApprovalPage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status === "approved") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-bg">
      {/* No role passed — this account doesn't have dashboard access yet,
          so the nav shows just the logo + Sign out, same as every other
          page, instead of a page with no header at all. */}
      <Navbar authed />
      <main className="mx-auto flex max-w-6xl items-center justify-center px-4 py-20 sm:px-6">
        <div className="card max-w-sm p-6 text-center">
          {user.status === "rejected" ? (
            <>
              <p className="font-display text-xl text-white">Account not approved</p>
              <p className="mt-2 text-sm text-slate-400">
                Your account request wasn't approved. Contact your admin if you think this is a mistake.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-xl text-white">Waiting for approval</p>
              <p className="mt-2 text-sm text-slate-400">
                Your {user.role} account is created but needs an admin to approve it before you can sign in.
                Check back soon, or browse the DSA topics below in the meantime — those don't need approval.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
