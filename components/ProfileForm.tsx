"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import { passwordStrengthError } from "@/lib/passwordStrength";
import PasswordInput from "@/components/PasswordInput";
import RoleBadge from "@/components/RoleBadge";
import type { UserRole } from "@/types";

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
    </div>
  );
}
