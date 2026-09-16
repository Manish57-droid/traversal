"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = supabaseBrowser();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);

    setSubmitting(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
        <Link href="/sign-in" className="text-sm text-fg-muted hover:text-fg">
          ← Back to sign in
        </Link>
        <div className="card w-full max-w-sm space-y-4 p-6 text-center">
          <p className="font-display text-xl text-fg">Check your email</p>
          <p className="text-sm text-fg-muted">
            If an account exists for {email}, we sent a verification code. Enter it on the next screen
            along with your new password.
          </p>
          <Link
            href={`/reset-password?email=${encodeURIComponent(email)}`}
            className="btn-primary inline-flex"
          >
            Enter code
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
      <Link href="/sign-in" className="text-sm text-fg-muted hover:text-fg">
        ← Back to sign in
      </Link>
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="font-display text-xl text-fg">Forgot password</p>
          <p className="mt-1 text-sm text-fg-muted">
            We'll email you a verification code to reset your password.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={submitting} className="btn-primary w-full">
          {submitting ? "Sending..." : "Send code"}
        </button>
      </form>
    </main>
  );
}
