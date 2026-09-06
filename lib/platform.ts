import type { QuestionPlatform } from "@/types";

/**
 * Detects the coding platform from a pasted question URL so we can
 * show the right badge/icon and route the "Solve" button correctly.
 * Falls back to "other" for anything we don't recognize — the link
 * still works, it just won't get a platform badge.
 */
export function detectPlatform(rawUrl: string): QuestionPlatform {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();

    if (host.includes("leetcode.com")) return "leetcode";
    if (host.includes("codechef.com")) return "codechef";
    if (host.includes("codeforces.com")) return "codeforces";
    if (host.includes("geeksforgeeks.org")) return "geeksforgeeks";
    if (host.includes("hackerrank.com")) return "hackerrank";
    return "other";
  } catch {
    return "other";
  }
}

/** Best-effort guess at a human title from the URL slug, used only
 * as a placeholder until the user edits it — we don't scrape the
 * target site for a real title since most block server-side fetches
 * or require auth. */
export function guessTitleFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const slug = segments[segments.length - 1] || url.hostname;
    return slug
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "Untitled question";
  }
}

export function isValidUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const PLATFORM_LABELS: Record<QuestionPlatform, string> = {
  leetcode: "LeetCode",
  codechef: "CodeChef",
  codeforces: "Codeforces",
  geeksforgeeks: "GeeksforGeeks",
  hackerrank: "HackerRank",
  other: "Other",
};

export const PLATFORM_COLORS: Record<QuestionPlatform, string> = {
  leetcode: "#FFA116",
  codechef: "#5B4638",
  codeforces: "#1F8ACB",
  geeksforgeeks: "#2F8D46",
  hackerrank: "#00EA64",
  other: "#7C5CFF",
};
