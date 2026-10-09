// Static, read-only theory for aptitude practice topics — the concepts,
// formulas and shortcuts a student reads on a topic's "Theory" tab
// before attempting its questions. Like lib/interview-guides, this
// lives in the repo, not the DB: edit the .md files next to this one
// and redeploy.
//
// Each .md file holds one category's topics, separated as:
//
//   === Topic name
//   ---
//   Markdown body (```calc for worked examples, GFM tables)
//
// Aptitude topics are teacher-managed rows (aptitude_topics.name is
// free text), so a section is matched to a topic by normalized name —
// case, "&" vs "and" and punctuation don't matter. A topic with no
// section here simply has no Theory tab.

import type { AptitudeCategory } from "@/types";
import quantSource from "./quant.md";
import logicalSource from "./logical.md";
import verbalSource from "./verbal.md";
import { normalizeTopicName } from "./shared";

export { normalizeTopicName } from "./shared";

const SOURCES: Record<AptitudeCategory, { source: string; file: string }> = {
  quant: { source: quantSource, file: "quant.md" },
  logical: { source: logicalSource, file: "logical.md" },
  verbal: { source: verbalSource, file: "verbal.md" },
};

export interface AptitudeTheory {
  title: string;
  body: string;
  readMinutes: number;
}

function parseSections(source: string, file: string): Map<string, AptitudeTheory> {
  const sections = new Map<string, AptitudeTheory>();
  for (const chunk of source.replace(/\r/g, "").split(/^=== /m).slice(1)) {
    const sep = chunk.indexOf("\n---\n");
    if (sep === -1) throw new Error(`${file}: topic is missing its "---" separator`);
    const title = chunk.slice(0, sep).split("\n")[0].trim();
    const body = chunk.slice(sep + 5).trim();
    const words = body.split(/\s+/).length;
    sections.set(normalizeTopicName(title), { title, body, readMinutes: Math.max(1, Math.round(words / 200)) });
  }
  return sections;
}

const THEORY: Record<AptitudeCategory, Map<string, AptitudeTheory>> = {
  quant: parseSections(SOURCES.quant.source, SOURCES.quant.file),
  logical: parseSections(SOURCES.logical.source, SOURCES.logical.file),
  verbal: parseSections(SOURCES.verbal.source, SOURCES.verbal.file),
};

export function getAptitudeTheory(category: AptitudeCategory, topic: string): AptitudeTheory | null {
  return THEORY[category]?.get(normalizeTopicName(topic)) ?? null;
}

/** Normalized names of every topic with theory, per category — small
 * enough to hand to the client topic picker for its "Theory" badges. */
export function theoryTopicKeys(category: AptitudeCategory): string[] {
  return Array.from(THEORY[category]?.keys() ?? []);
}
