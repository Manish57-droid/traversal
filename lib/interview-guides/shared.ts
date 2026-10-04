// Client-safe pieces of the guides module — kept apart from index.ts,
// which imports the .md content, so client components can use these
// without pulling every guide's text into their bundle.

export type GuideDifficulty = "easy" | "medium" | "hard";

export interface GuideTopicSummary {
  slug: string;
  title: string;
  difficulty: GuideDifficulty;
}

export const lastTopicKey = (guideSlug: string) => `interview-guide:last-topic:${guideSlug}`;
