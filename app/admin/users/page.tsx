"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser-client";
import type { AppUser, UserRole, UserStatus } from "@/types";

const ROLES: UserRole[] = ["student", "teacher", "admin"];

// Kept in sync with app/api/admin/users/route.ts, which is what
// actually enforces this — the disabled dropdown here is just so the
// UI doesn't invite an admin to try (and get a rejected request) in
// the first place.
const PROTECTED_ADMIN_EMAIL = "manishkushwaha572000@gmail.com";

const STATUS_STYLE: Record<UserStatus, string> = {
  pending: "border-warn/40 text-warn",
  approved: "border-success/40 text-success",
  rejected: "border-red-500/40 text-red-400",
};

// Convenience prefill only — the admin can edit it before submitting.
// Meets lib/passwordStrength.ts's rule (8+ chars, at least one digit).
function generateTempPassword() {
  const words = ["Copper", "Circuit", "Vertex", "Sprint", "Pixel", "Nimbus", "Cobalt", "Delta"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}!`;
}

interface BlastRadius {
  user: { id: string; full_name: string | null; email: string; role: UserRole };
  classes_owned_count: number;
  students_enrolled_count: number;
  dsa_questions_authored_count: number;
  aptitude_questions_authored_count: number;
  interview_questions_authored_count: number;
  proctored_questions_authored_count: number;
}

function DeleteUserDialog({
  userId,
  onClose,
  onDeleted,
}: {
  userId: string;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const [blast, setBlast] = useState<BlastRadius | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}/blast-radius`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setBlast(d);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const totalQuestions = blast
    ? blast.dsa_questions_authored_count +
      blast.aptitude_questions_authored_count +
      blast.interview_questions_authored_count +
      blast.proctored_questions_authored_count
    : 0;

  const emailMatches = blast && confirmEmail.trim().toLowerCase() === blast.user.email.toLowerCase();

  async function handleDelete() {
    if (!emailMatches) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onDeleted(userId);
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur">
      <div className="card w-full max-w-md space-y-4 p-6">
        <div>
          <p className="font-display text-lg text-fg">Delete this account?</p>
          <p className="mt-1 text-xs text-fg-subtle">This cannot be undone.</p>
        </div>

        {loading && <p className="text-sm text-fg-muted">Loading blast radius…</p>}

        {blast && (
          <div className="space-y-2 rounded-lg border border-warn/40 bg-warn/5 p-3 text-sm">
            <p className="text-fg">
              <span className="font-medium">{blast.user.full_name || blast.user.email}</span>{" "}
              <span className="text-xs uppercase text-fg-subtle">({blast.user.role})</span>
            </p>
            <ul className="space-y-1 text-xs text-fg-muted">
              <li>{blast.classes_owned_count} class{blast.classes_owned_count === 1 ? "" : "es"} owned — will be deleted entirely</li>
              <li>{blast.students_enrolled_count} student enrollment{blast.students_enrolled_count === 1 ? "" : "s"} in those classes</li>
              <li>{totalQuestions} authored question{totalQuestions === 1 ? "" : "s"} across DSA/Aptitude/Interview Prep/Proctored</li>
            </ul>
          </div>
        )}

        {blast && (
          <div>
            <label className="mb-1 block text-xs text-fg-muted">
              Type <span className="font-medium text-fg">{blast.user.email}</span> to confirm
            </label>
            <input
              className="input"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary py-1.5 text-xs">
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!emailMatches || deleting}
            className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-40"
          >
            {deleting ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Shared "here are the credentials, copy them now" confirmation —
// shown once after create/reset since the password is never
// retrievable again afterward (Supabase Auth only ever stores its hash).
function CredentialsConfirmation({
  email,
  password,
  onDone,
}: {
  email: string;
  password: string;
  onDone: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg">
        Share these with the user — they'll be asked to set their own password the first time they sign in.
      </p>
      <div className="space-y-2 rounded-lg border border-line/70 bg-surface-2 p-3 font-mono text-sm">
        <p className="text-fg-muted">
          Email <span className="text-fg">{email}</span>
        </p>
        <p className="text-fg-muted">
          Password <span className="text-fg">{password}</span>
        </p>
      </div>
      <div className="flex justify-end">
        <button onClick={onDone} className="btn-primary py-1.5 text-xs">
          Done
        </button>
      </div>
    </div>
  );
}

function AddUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generateTempPassword());
  const [role, setRole] = useState<UserRole>("student");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreated(true);
      onCreated();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur">
      <div className="card w-full max-w-md space-y-4 p-6">
        <div>
          <p className="font-display text-lg text-fg">Add a user</p>
          <p className="mt-1 text-xs text-fg-subtle">Creates the login directly — approved immediately, no sign-up needed.</p>
        </div>

        {created ? (
          <CredentialsConfirmation email={email} password={password} onDone={onClose} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Full name</label>
              <input required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Email</label>
              <input required type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Temporary password</label>
              <div className="flex items-center gap-2">
                <input required className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button
                  type="button"
                  onClick={() => setPassword(generateTempPassword())}
                  className="btn-secondary shrink-0 py-2.5 text-xs"
                >
                  Generate
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-fg-muted">Role</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLES.map((r) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary py-1.5 text-xs">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary py-1.5 text-xs">
                {submitting ? "Creating..." : "Create user"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  user,
  onClose,
}: {
  user: { id: string; email: string; full_name: string | null };
  onClose: () => void;
}) {
  const [password, setPassword] = useState(generateTempPassword());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4 backdrop-blur">
      <div className="card w-full max-w-md space-y-4 p-6">
        <div>
          <p className="font-display text-lg text-fg">Reset password</p>
          <p className="mt-1 text-xs text-fg-subtle">
            For <span className="text-fg">{user.full_name || user.email}</span>
          </p>
        </div>

        {done ? (
          <CredentialsConfirmation email={user.email} password={password} onDone={onClose} />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-fg-muted">New temporary password</label>
              <div className="flex items-center gap-2">
                <input required autoFocus className="input font-mono" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button
                  type="button"
                  onClick={() => setPassword(generateTempPassword())}
                  className="btn-secondary shrink-0 py-2.5 text-xs"
                >
                  Generate
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary py-1.5 text-xs">
                Cancel
              </button>
              <button type="submit" disabled={submitting} className="btn-primary py-1.5 text-xs">
                {submitting ? "Resetting..." : "Reset password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | UserStatus>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [search, setSearch] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    supabaseBrowser()
      .auth.getUser()
      .then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  async function patchUser(id: string, body: { role?: UserRole; status?: UserStatus }) {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...body } : u)));
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
  }

  function handleDeleted(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeleteTargetId(null);
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (filter !== "all" && u.status !== filter) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (normalizedSearch) {
      const haystack = `${u.full_name ?? ""} ${u.email}`.toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });
  const pendingCount = users.filter((u) => u.status === "pending").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-fg sm:text-3xl">Users</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Approve new sign-ups and manage roles. {pendingCount > 0 && `${pendingCount} waiting on you.`}
          </p>
        </div>
        <button onClick={() => setShowAddUser(true)} className="btn-primary shrink-0 py-2 text-xs">
          + Add user
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input w-auto min-w-[200px] flex-1 py-1.5 text-xs"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-auto py-1.5 text-xs"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">{r}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
                filter === f
                  ? "border-success/60 bg-success/10 text-success"
                  : "border-line/70 text-fg-muted hover:border-line"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-fg-subtle">
        {filtered.length} of {users.length} user{users.length === 1 ? "" : "s"}
      </p>

      {loading ? (
        <p className="text-sm text-fg-muted">Loading…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line/70 text-xs uppercase tracking-wide text-fg-subtle">
              <tr>
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal">Email</th>
                <th className="px-4 py-3 font-normal">Role</th>
                <th className="px-4 py-3 font-normal">Status</th>
                <th className="px-4 py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = u.id === currentUserId;
                const isLastAdmin = u.role === "admin" && adminCount <= 1;
                const isProtectedAdmin = u.email.toLowerCase() === PROTECTED_ADMIN_EMAIL;
                return (
                  <tr key={u.id} className="border-b border-line/40 last:border-0">
                    <td className="px-4 py-3 text-fg">{u.full_name || "—"}</td>
                    <td className="px-4 py-3 text-fg-muted">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        className="input w-auto py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                        value={u.role}
                        disabled={isProtectedAdmin}
                        title={isProtectedAdmin ? "This account's role is protected and can't be changed." : undefined}
                        onChange={(e) => patchUser(u.id, { role: e.target.value as UserRole })}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[u.status]}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {u.status !== "approved" && (
                          <button
                            onClick={() => patchUser(u.id, { status: "approved" })}
                            className="text-xs text-success hover:underline"
                          >
                            Approve
                          </button>
                        )}
                        {u.status !== "rejected" && (
                          <button
                            onClick={() => patchUser(u.id, { status: "rejected" })}
                            className="text-xs text-fg-subtle hover:text-red-400"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => setResetTarget(u)}
                          className="text-xs text-fg-muted hover:text-fg"
                        >
                          Reset password
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(u.id)}
                          disabled={isSelf || isLastAdmin}
                          title={
                            isSelf
                              ? "You can't delete your own account."
                              : isLastAdmin
                                ? "Can't delete the last remaining admin."
                                : undefined
                          }
                          className="text-xs text-fg-subtle hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-fg-subtle"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-fg-subtle">
                    No users in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteTargetId && (
        <DeleteUserDialog
          userId={deleteTargetId}
          onClose={() => setDeleteTargetId(null)}
          onDeleted={handleDeleted}
        />
      )}

      {showAddUser && (
        <AddUserDialog
          onClose={() => setShowAddUser(false)}
          onCreated={load}
        />
      )}

      {resetTarget && (
        <ResetPasswordDialog
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  );
}
