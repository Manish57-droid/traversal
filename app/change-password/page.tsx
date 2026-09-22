"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import { passwordStrengthError } from "@/lib/passwordStrength";
import PasswordInput from "@/components/PasswordInput";

// Reached only via middleware's force_password_change redirect (new
// account or an admin-triggered reset — see app/api/admin/users and
// .../[id]/reset-password). Unlike /reset-password (OTP-based, for a
// signed-out visitor), this user already has a session from signing
// in with the admin-set password, so updateUser needs no code —
// just clear the flag server-side once it succeeds.
export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }

    await fetch("/api/account/password-changed", { method: "POST" });
    setSubmitting(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <p className="font-display text-xl text-fg">Set a new password</p>
          <p className="mt-1 text-sm text-fg-muted">
            An admin set up (or reset) this account's password — choose your own before continuing.
          </p>
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
          {submitting ? "Saving..." : "Set new password"}
        </button>
      </form>
    </main>
  );
}
