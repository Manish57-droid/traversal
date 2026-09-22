"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import PasswordInput from "@/components/PasswordInput";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountDeleted = searchParams.get("accountDeleted") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = supabaseBrowser();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
      <Link href="/" className="text-sm text-fg-muted hover:text-fg">
        ← Back to home
      </Link>

      {accountDeleted && (
        <p className="w-full max-w-sm rounded-lg border border-success/40 bg-success/10 px-4 py-2 text-center text-xs text-success">
          Your account has been permanently deleted.
        </p>
      )}

      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <p className="font-display text-xl text-fg">Sign in</p>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-xs text-fg-muted" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-xs text-fg-subtle hover:text-fg">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-center text-xs text-fg-subtle">
          No account yet?{" "}
          <Link href="/sign-up" className="text-success hover:underline">Create one</Link>
        </p>
      </form>
    </main>
  );
}
