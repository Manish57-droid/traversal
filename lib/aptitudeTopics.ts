import type { AptitudeCategory } from "@/types";

// A starting taxonomy of topic NAMES (structure/naming only, inspired
// by how aptitude-prep resources commonly group these — no question
// content taken from anywhere) offered as autocomplete suggestions on
// the free-text `topic` field in the teacher question-bank UI.
// `topic` stays free text — a teacher can always type something not
// in this list.
export const APTITUDE_TOPIC_SUGGESTIONS: Record<AptitudeCategory, string[]> = {
  quant: [
    "Time & Work",
    "Time, Speed & Distance",
    "Profit & Loss",
    "Percentages",
    "Ratio & Proportion",
    "Simple & Compound Interest",
    "Averages",
    "Number System",
    "Permutation & Combination",
    "Probability",
    "Mixtures & Alligations",
    "Ages",
  ],
  logical: [
    "Blood Relations",
    "Syllogisms",
    "Seating Arrangement",
    "Coding-Decoding",
    "Direction Sense",
    "Number & Letter Series",
    "Puzzles",
    "Data Sufficiency",
    "Clocks & Calendars",
    "Venn Diagrams",
  ],
  verbal: [
    "Reading Comprehension",
    "Synonyms & Antonyms",
    "Sentence Correction",
    "Para Jumbles",
    "Fill in the Blanks",
    "Idioms & Phrases",
    "One Word Substitution",
    "Analogies",
    "Error Spotting",
    "Cloze Test",
  ],
};
