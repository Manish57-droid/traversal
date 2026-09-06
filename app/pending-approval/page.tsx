import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentAppUser } from "@/lib/roles";
import { supabaseServer } from "@/lib/supabase/server-client";

export default async function PendingApprovalPage() {
  const user = await getCurrentAppUser();
  if (!user) redirect("/sign-in");
  if (user.status === "approved") redirect("/dashboard");

  async function signOut() {
    "use server";
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
    redirect("/sign-in");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
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
              Check back soon.
            </p>
          </>
        )}
        <form action={signOut}>
          <button type="submit" className="btn-secondary mt-4">Sign out</button>
        </form>
        <Link href="/" className="mt-3 block text-xs text-slate-500 hover:text-white">Back to home</Link>
      </div>
    </main>
  );
}
