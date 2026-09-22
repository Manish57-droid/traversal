"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import { passwordStrengthError } from "@/lib/passwordStrength";
import PasswordInput from "@/components/PasswordInput";
import RoleBadge from "@/components/RoleBadge";
import type { UserRole } from "@/types";

interface BlastRadius {
  classes_owned_count: number;
  students_enrolled_count: number;
  dsa_questions_authored_count: number;
  aptitude_questions_authored_count: number;
  interview_questions_authored_count: number;
  proctored_questions_authored_count: number;
  is_last_admin: boolean;
}

// Self-service account deletion, deliberately mirroring the admin
// "delete this user" dialog (app/admin/users/page.tsx) — same blast-
// radius preview, same irreversible framing — but confirmed with the
// account's own current password instead of typing someone else's
// email, since here the person confirming and the account being
// destroyed are the same person.
function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const [blast, setBlast] = useState<BlastRadius | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/blast-radius")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setBlast(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalQuestions = blast
    ? blast.dsa_questions_authored_count +
      blast.aptitude_questions_authored_count +
      blast.interview_questions_authored_count +
      blast.proctored_questions_authored_count
    : 0;

  async function handleDelete() {
    if (!password) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // The users row and Auth account are already gone server-side —
      // this just clears the now-dangling session cookie client-side,
      // then a full navigation (not router.push) so every bit of
      // cached app state is dropped along with it.
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      window.location.href = "/sign-in?accountDeleted=1";
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur">
      <div className="card w-full max-w-md space-y-4 p-6">
        <div>
          <p className="font-display text-lg text-fg">Delete your account?</p>
          <p className="mt-1 text-xs text-fg-subtle">This cannot be undone.</p>
        </div>

        {loading && <p className="text-sm text-fg-muted">Loading…</p>}

        {blast && blast.is_last_admin && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-400">
            You're the last remaining admin — promote another admin before you can delete this account.
          </p>
        )}

        {blast && !blast.is_last_admin && (blast.classes_owned_count > 0 || totalQuestions > 0) && (
          <div className="space-y-2 rounded-lg border border-warn/40 bg-warn/5 p-3 text-sm">
            <p className="text-fg">This will also permanently delete:</p>
            <ul className="space-y-1 text-xs text-fg-muted">
              {blast.classes_owned_count > 0 && (
                <li>
                  {blast.classes_owned_count} class{blast.classes_owned_count === 1 ? "" : "es"} you own, and{" "}
                  {blast.students_enrolled_count} enrollment{blast.students_enrolled_count === 1 ? "" : "s"} in {blast.classes_owned_count === 1 ? "it" : "them"}
                </li>
              )}
              {totalQuestions > 0 && (
                <li>
                  {totalQuestions} question{totalQuestions === 1 ? "" : "s"} you authored across DSA/Aptitude/Interview Prep/Proctored
                </li>
              )}
            </ul>
          </div>
        )}

        {blast && !blast.is_last_admin && (
          <div>
            <label className="mb-1 block text-xs text-fg-muted" htmlFor="deletePassword">
              Enter your password to confirm
            </label>
            <PasswordInput
              id="deletePassword"
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-1.5 text-xs">
            Cancel
          </button>
          {blast && !blast.is_last_admin && (
            <button
              onClick={handleDelete}
              disabled={!password || deleting}
              className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40"
            >
              {deleting ? "Deleting..." : "Delete my account"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfileForm({
  userId,
  email,
  fullName,
  role,
}: {
  userId: string;
  email: string;
  fullName: string | null;
  role: UserRole;
}) {
  const [name, setName] = useState(fullName ?? "");
  const [savedName, setSavedName] = useState(fullName ?? "");
  const [editingName, setEditingName] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  async function handleSaveName() {
    if (!name.trim() || name.trim() === savedName) {
      setEditingName(false);
      setName(savedName);
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedName(name.trim());
      setEditingName(false);
      // The navbar reads the name server-side on layout render — a
      // full refresh is the simplest way to make it show the new
      // value immediately without threading a second data source.
      window.location.reload();
    } catch (err: any) {
      setNameError(err.message);
    } finally {
      setNameSaving(false);
    }
  }

  function cancelNameEdit() {
    setName(savedName);
    setEditingName(false);
    setNameError(null);
  }

  const strengthError = newPassword ? passwordStrengthError(newPassword) : null;
  const mismatchError = confirmPassword && newPassword !== confirmPassword ? "Passwords do not match." : null;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (strengthError) {
      setPasswordError(strengthError);
      return;
    }
    if (mismatchError) {
      setPasswordError(mismatchError);
      return;
    }

    setPasswordSubmitting(true);
    const supabase = supabaseBrowser();

    // Re-authenticate with the current password before allowing the
    // change — signInWithPassword fails cleanly if it's wrong, so this
    // doubles as the "current password is incorrect" check without a
    // separate verification endpoint.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (reauthError) {
      setPasswordError("Current password is incorrect.");
      setPasswordSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });

    setPasswordSubmitting(false);

    if (updateError) {
      setPasswordError(updateError.message);
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-5">
        <p className="text-sm font-medium text-fg">Account</p>

        <div>
          <p className="mb-1 text-xs text-fg-muted">Name</p>
          {editingName ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <button onClick={handleSaveName} disabled={nameSaving} className="btn-primary py-1.5 text-xs">
                  {nameSaving ? "Saving..." : "Save"}
                </button>
                <button onClick={cancelNameEdit} className="btn-secondary py-1.5 text-xs">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <p className="text-fg">{savedName || "—"}</p>
              <button
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </div>
          )}
          {nameError && <p className="mt-1 text-sm text-red-400">{nameError}</p>}
        </div>

        <div>
          <p className="mb-1 text-xs text-fg-muted">Email</p>
          <p className="text-fg-muted">{email}</p>
        </div>

        <div>
          <p className="mb-1 text-xs text-fg-muted">Role</p>
          <RoleBadge role={role} />
        </div>
      </div>

      <form onSubmit={handleChangePassword} className="card space-y-4 p-5">
        <p className="text-sm font-medium text-fg">Change password</p>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="currentPassword">
            Current password
          </label>
          <PasswordInput
            id="currentPassword"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={setCurrentPassword}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="newPassword">
            New password
          </label>
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
          <label className="mb-1 block text-xs text-fg-muted" htmlFor="confirmPassword">
            Confirm new password
          </label>
          <PasswordInput
            id="confirmPassword"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          {mismatchError && <p className="mt-1 text-xs text-red-400">{mismatchError}</p>}
        </div>

        <button
          type="submit"
          disabled={passwordSubmitting || !!strengthError || !!mismatchError}
          className="btn-primary"
        >
          {passwordSubmitting ? "Changing password..." : "Change password"}
        </button>

        {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
        {passwordSuccess && <p className="text-sm text-success">Password changed successfully.</p>}
      </form>

      <div className="card space-y-3 border-red-500/30 p-5">
        <p className="text-sm font-medium text-fg">Danger zone</p>
        <p className="text-xs text-fg-muted">
          Permanently delete your account and everything tied to it. This cannot be undone.
        </p>
        <button onClick={() => setShowDeleteDialog(true)} className="btn-secondary py-1.5 text-xs text-red-400 hover:border-red-500/40">
          Delete my account
        </button>
      </div>

      {showDeleteDialog && <DeleteAccountDialog onClose={() => setShowDeleteDialog(false)} />}
    </div>
  );
}
