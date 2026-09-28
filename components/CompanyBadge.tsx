import { getCompanyIcon } from "@/lib/companyIcons";

// Real brand icon when we have one for this company, otherwise a
// colored circle with its initial — never a broken/missing icon.
export default function CompanyBadge({ name, frequency }: { name: string; frequency?: number | null }) {
  const { Icon, color, initial } = getCompanyIcon(name);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface-2 py-0.5 pl-1 pr-2 text-xs text-fg">
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        {Icon ? <Icon className="h-2.5 w-2.5" /> : <span className="text-[9px] font-semibold leading-none">{initial}</span>}
      </span>
      {name}
      {typeof frequency === "number" && <span className="text-fg-subtle">· {frequency}</span>}
    </span>
  );
}
