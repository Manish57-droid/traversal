import type { UserRole } from "@/types";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};

// One consistent accent-based pill style regardless of role — the
// role name is what differs, not the color, per the "don't invent a
// new color per role" instruction.
export default function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
      {ROLE_LABEL[role]}
    </span>
  );
}
