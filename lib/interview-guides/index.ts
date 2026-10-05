// Static, read-only Interview Prep guides — long-form subject
// reading material, paged one topic at a time at
// /student/interview-prep/guides/[guide]/[topic]. Unlike the
// teacher-authored categories (interview_categories /
// interview_questions), these live in the repo, not the DB: edit the
// .md files next to this one and redeploy.
//
// Each .md file holds one guide's topics in reading order, separated as:
//
//   === Topic title
//   difficulty: easy | medium | hard
//   ---
//   Markdown body (```cpp code, ```text output, ```mermaid diagrams)
//
// The .md files are bundled as plain strings (see the asset/source rule
// in next.config.js), so nothing is read from disk at request time.

import cppSource from "./cpp.md";
import oopCppSource from "./oop-cpp.md";
import networkingSource from "./networking.md";
import osSource from "./os.md";
import dbmsSource from "./dbms.md";
import sqlSource from "./sql.md";
import { GUIDE_INFO, type GuideDifficulty, type GuideInfo } from "./shared";

export type { GuideDifficulty, GuideTopicSummary, GuideInfo } from "./shared";

// To add a guide: write its .md file, import it above, add its
// GUIDE_INFO entry in shared.ts, and map the slug to the source here.
const SOURCES: Record<string, { source: string; file: string }> = {
  cpp: { source: cppSource, file: "cpp.md" },
  oop: { source: oopCppSource, file: "oop-cpp.md" },
  networking: { source: networkingSource, file: "networking.md" },
  os: { source: osSource, file: "os.md" },
  dbms: { source: dbmsSource, file: "dbms.md" },
  sql: { source: sqlSource, file: "sql.md" },
};

export interface GuideTopic {
  slug: string;
  title: string;
  difficulty: GuideDifficulty;
  body: string;
  readMinutes: number;
}

export interface InterviewGuide extends GuideInfo {
  topics: GuideTopic[];
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/\+\+/g, "pp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseTopics(source: string, file: string): GuideTopic[] {
  return source
    .replace(/\r/g, "")
    .split(/^=== /m)
    .slice(1)
    .map((chunk) => {
      const sep = chunk.indexOf("\n---\n");
      if (sep === -1) throw new Error(`${file}: topic is missing its "---" separator`);
      const [titleLine, ...meta] = chunk.slice(0, sep).split("\n");
      const title = titleLine.trim();
      const difficulty = meta
        .find((l) => l.startsWith("difficulty:"))
        ?.split(":")[1]
        .trim() as GuideDifficulty | undefined;
      if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
        throw new Error(`${file}: "${title}" needs difficulty: easy | medium | hard`);
      }
      const body = chunk.slice(sep + 5).trim();
      const words = body.split(/\s+/).length;
      return { slug: slugify(title), title, difficulty, body, readMinutes: Math.max(1, Math.round(words / 200)) };
    });
}

export const INTERVIEW_GUIDES: InterviewGuide[] = GUIDE_INFO.map((info) => {
  const entry = SOURCES[info.slug];
  if (!entry) throw new Error(`No .md source mapped for guide "${info.slug}"`);
  return { ...info, topics: parseTopics(entry.source, entry.file) };
});

export function getGuide(slug: string) {
  return INTERVIEW_GUIDES.find((g) => g.slug === slug) ?? null;
}
