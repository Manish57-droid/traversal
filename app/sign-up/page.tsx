"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import PasswordInput from "@/components/PasswordInput";

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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
        <Link href="/" className="text-sm text-fg-muted hover:text-fg">
          ← Back to home
        </Link>
        <div className="card max-w-sm p-6 text-center">
          <p className="font-display text-xl text-fg">Check your email</p>
          <p className="mt-2 text-sm text-fg-muted">
            We sent a confirmation link to {email}. Click it, then sign in.
          </p>
          <Link href="/sign-in" className="btn-primary mt-4 inline-flex">Go to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 py-10">
      <Link href="/" className="text-sm text-fg-muted hover:text-fg">
        ← Back to home
      </Link>
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="font-display text-xl text-fg">Create your account</p>
          <p className="mt-1 text-sm text-fg-muted">
            {requestedRole === "teacher"
              ? "An admin approves teacher accounts before you can sign in."
              : "Students can sign in right away — no approval needed."}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="fullName">Full name</label>
          <input id="fullName" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />
        </div>

        <div>
          <p className="mb-1 block text-xs text-fg-muted">I am a</p>
          <div className="flex gap-3">
            {(["student", "teacher"] as const).map((r) => (
              <label
                key={r}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm capitalize transition-colors ${
                  requestedRole === r
                    ? "border-success/60 bg-success/10 text-success"
                    : "border-line/70 text-fg hover:border-line"
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

        <p className="text-center text-xs text-fg-subtle">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-success hover:underline">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
