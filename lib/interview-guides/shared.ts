// Client-safe pieces of the guides module — kept apart from index.ts,
// which imports the .md content, so client components can use these
// without pulling every guide's text into their bundle.

export type GuideDifficulty = "easy" | "medium" | "hard";

export interface GuideTopicSummary {
  slug: string;
  title: string;
  difficulty: GuideDifficulty;
}

export interface GuideInfo {
  // Same slug as the subject's interview_categories row (if it has
  // one): that's how a guide and a teacher-authored category are shown
  // as one subject on the Interview Prep page.
  slug: string;
  name: string;
  description: string;
  icon: string; // a key of INTERVIEW_ICONS (lib/interviewIcons.ts)
}

export const GUIDE_INFO: GuideInfo[] = [
  {
    slug: "cpp",
    name: "C++ Programming",
    description: "C++ from the basics to advanced topics — pointers, memory, templates, exceptions and the STL, with worked examples.",
    icon: "Code2",
  },
  {
    slug: "oop",
    name: "OOP in C++",
    description: "Classes, constructors, inheritance, virtual functions and polymorphism — object-oriented programming explained through C++ code.",
    icon: "Boxes",
  },
];

export const lastTopicKey = (guideSlug: string) => `interview-guide:last-topic:${guideSlug}`;
