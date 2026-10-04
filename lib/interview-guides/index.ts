// Static, read-only Interview Prep guides — long-form C++ and OOP
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
import type { GuideDifficulty } from "./shared";

export type { GuideDifficulty, GuideTopicSummary } from "./shared";

export interface GuideTopic {
  slug: string;
  title: string;
  difficulty: GuideDifficulty;
  body: string;
  readMinutes: number;
}

export interface InterviewGuide {
  slug: string;
  name: string;
  description: string;
  icon: string; // a key of INTERVIEW_ICONS (lib/interviewIcons.ts)
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

export const INTERVIEW_GUIDES: InterviewGuide[] = [
  {
    slug: "cpp",
    name: "C++ Programming",
    description: "C++ from the basics to advanced topics — pointers, memory, templates, exceptions and the STL, with worked examples.",
    icon: "Code2",
    topics: parseTopics(cppSource, "cpp.md"),
  },
  {
    slug: "oop-cpp",
    name: "OOP in C++",
    description: "Classes, constructors, inheritance, virtual functions and polymorphism — object-oriented programming explained through C++ code.",
    icon: "Boxes",
    topics: parseTopics(oopCppSource, "oop-cpp.md"),
  },
];

export function getGuide(slug: string) {
  return INTERVIEW_GUIDES.find((g) => g.slug === slug) ?? null;
}
