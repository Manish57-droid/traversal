import {
  SiGoogle,
  SiApple,
  SiMeta,
  SiNetflix,
  SiUber,
  SiTcs,
  SiAccenture,
  SiInfosys,
  SiWipro,
  SiIntel,
  SiNvidia,
  SiSamsung,
  SiPaypal,
  SiVisa,
  SiMastercard,
  SiAirbnb,
  SiSpotify,
  SiAtlassian,
  SiZoho,
  SiGoldmansachs,
} from "react-icons/si";
import type { IconType } from "react-icons";

// Confirmed against the installed react-icons/si package directly
// rather than guessed — brand icons come and go from Simple Icons, so
// any company not listed here (including ones a teacher adds, like
// Adobe/Amazon/Microsoft which Simple Icons doesn't currently carry)
// falls back to a colored initial instead of a broken import.
const KNOWN_ICONS: Record<string, { icon: IconType; color: string }> = {
  google: { icon: SiGoogle, color: "#4285F4" },
  apple: { icon: SiApple, color: "#555555" },
  meta: { icon: SiMeta, color: "#0866FF" },
  facebook: { icon: SiMeta, color: "#0866FF" },
  netflix: { icon: SiNetflix, color: "#E50914" },
  uber: { icon: SiUber, color: "#000000" },
  tcs: { icon: SiTcs, color: "#EE3524" },
  "tata consultancy services": { icon: SiTcs, color: "#EE3524" },
  accenture: { icon: SiAccenture, color: "#A100FF" },
  infosys: { icon: SiInfosys, color: "#007CC3" },
  wipro: { icon: SiWipro, color: "#341F65" },
  intel: { icon: SiIntel, color: "#0071C5" },
  nvidia: { icon: SiNvidia, color: "#76B900" },
  samsung: { icon: SiSamsung, color: "#1428A0" },
  paypal: { icon: SiPaypal, color: "#00457C" },
  visa: { icon: SiVisa, color: "#1A1F71" },
  mastercard: { icon: SiMastercard, color: "#EB001B" },
  airbnb: { icon: SiAirbnb, color: "#FF5A5F" },
  spotify: { icon: SiSpotify, color: "#1DB954" },
  atlassian: { icon: SiAtlassian, color: "#0052CC" },
  zoho: { icon: SiZoho, color: "#C8202F" },
  "goldman sachs": { icon: SiGoldmansachs, color: "#7399C6" },
};

// A handful of visually-distinct, on-theme colors for the fallback
// badge — picked deterministically from the name so the same company
// always lands on the same color across reloads/sessions.
const FALLBACK_COLORS = [
  "#B05C2A",
  "#966C14",
  "#2F8D46",
  "#1F8ACB",
  "#8D46A1",
  "#C24428",
  "#5B4638",
  "#A88CFF",
  "#D9824C",
  "#4A9A8F",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function getCompanyIcon(name: string): { Icon: IconType | null; color: string; initial: string } {
  const key = name.trim().toLowerCase();
  const known = KNOWN_ICONS[key];
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (known) return { Icon: known.icon, color: known.color, initial };
  return { Icon: null, color: FALLBACK_COLORS[hashString(key) % FALLBACK_COLORS.length], initial };
}
