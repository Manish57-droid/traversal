"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState<"student" | "teacher">("student");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = supabaseBrowser();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, requested_role: requestedRole },
      },
    });

    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is enabled in Supabase Auth settings,
    // there's no session yet — send them to check their inbox instead
    // of straight to /dashboard.
    if (!data.session) {
      setCheckEmail(true);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg px-4">
        <div className="card max-w-sm p-6 text-center">
          <p className="font-display text-xl text-white">Check your email</p>
          <p className="mt-2 text-sm text-slate-400">
            We sent a confirmation link to {email}. Click it, then sign in.
          </p>
          <Link href="/sign-in" className="btn-primary mt-4 inline-flex">Go to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="font-display text-xl text-white">Create your account</p>
          <p className="mt-1 text-sm text-slate-400">
            An admin approves new accounts before you can sign in.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-slate-400" htmlFor="fullName">Full name</label>
          <input id="fullName" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <div>
          <p className="mb-1 block text-xs text-slate-400">I am a</p>
          <div className="flex gap-3">
            {(["student", "teacher"] as const).map((r) => (
              <label
                key={r}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm capitalize transition-colors ${
                  requestedRole === r
                    ? "border-success/60 bg-success/10 text-success"
                    : "border-white/10 text-slate-300 hover:border-white/25"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={requestedRole === r}
                  onChange={() => setRequestedRole(r)}
                  className="sr-only"
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-success hover:underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
