import {
  Boxes,
  Code2,
  Coffee,
  Cpu,
  Database,
  FileCode,
  HelpCircle,
  Layers,
  Network,
  Server,
  Terminal,
  type LucideIcon,
} from "lucide-react";

// Admin picks an icon name (free text on `interview_categories.icon`)
// from this known set when authoring a category — mapped here to the
// actual component. Anything unrecognized falls back to a generic
// icon rather than rendering nothing.
export const INTERVIEW_ICONS: Record<string, LucideIcon> = {
  Code2,
  Coffee,
  Terminal,
  Database,
  Server,
  Cpu,
  Network,
  Layers,
  Boxes,
  FileCode,
};

export const INTERVIEW_ICON_NAMES = Object.keys(INTERVIEW_ICONS);

export function getInterviewIcon(name: string): LucideIcon {
  return INTERVIEW_ICONS[name] ?? HelpCircle;
}
