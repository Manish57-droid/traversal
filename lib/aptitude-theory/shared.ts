// Client-safe pieces of the aptitude theory module — kept apart from
// index.ts, which imports the .md content, so client components can use
// these without pulling every topic's text into their bundle.

/** Topic names are teacher-entered free text, so theory sections are
 * matched by this key: case, "&" vs "and" and punctuation are ignored
 * ("Profit & Loss" and "profit and loss" match). */
export function normalizeTopicName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "");
}
