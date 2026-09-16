"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import { passwordStrengthError } from "@/lib/passwordStrength";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const strengthError = newPassword ? passwordStrengthError(newPassword) : null;
  const mismatchError = confirmPassword && newPassword !== confirmPassword ? "Passwords do not match." : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (strengthError) {
      setError(strengthError);
      return;
    }
    if (mismatchError) {
      setError(mismatchError);
      return;
    }

    setSubmitting(true);
    const supabase = supabaseBrowser();

    // Exchanges the emailed verification code for a real session — this is
    // what actually authenticates the reset, not the password itself.
    // An expired or wrong code surfaces here plainly rather than
    // failing silently.
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    if (verifyError) {
      setError(verifyError.message || "That code is invalid or has expired. Request a new one.");
      setSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
        <div className="card w-full max-w-sm space-y-4 p-6 text-center">
          <p className="font-display text-xl text-fg">Password updated</p>
          <p className="text-sm text-fg-muted">You can now sign in with your new password.</p>
          <Link href="/sign-in" className="btn-primary inline-flex">Go to sign in</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
      <Link href="/forgot-password" className="text-sm text-fg-muted hover:text-fg">
        ← Request a new code
      </Link>
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="font-display text-xl text-fg">Reset password</p>
          <p className="mt-1 text-sm text-fg-muted">Enter the verification code we emailed you.</p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="code">Code from your email</label>
          <input
            id="code"
            required
            inputMode="numeric"
            // Not capped to 6 digits — the actual OTP length is
            // whatever this Supabase project is configured to issue
            // (confirmed via live testing to be longer than 6 in this
            // project), and the server is what actually validates it,
            // not a client-side length guess.
            maxLength={12}
            className="input tracking-[0.3em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="newPassword">New password</label>
          <PasswordInput
            id="newPassword"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={setNewPassword}
          />
          {newPassword && (
            <p className={`mt-1 text-xs ${strengthError ? "text-warn" : "text-success"}`}>
              {strengthError ?? "Password meets the minimum strength requirement."}
            </p>
          )}
          {!newPassword && (
            <p className="mt-1 text-xs text-fg-subtle">At least 8 characters, including a number.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="confirmPassword">Confirm new password</label>
          <PasswordInput
            id="confirmPassword"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {mismatchError && <p className="mt-1 text-xs text-red-400">{mismatchError}</p>}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={submitting || !!strengthError || !!mismatchError} className="btn-primary w-full">
          {submitting ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </main>
  );
}
