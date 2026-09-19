// Parser for the "Bulk Add from Paste" importer — turns a block of
// freeform pasted text into a list of candidate MCQs for the teacher
// to review/edit before anything is saved. Runs entirely client-side
// (no data leaves the browser until the review screen is confirmed).
//
// Heuristic, not a strict grammar. Question boundaries are numbered
// lines ("Q1.", "1)", "1."). Options nested under a question reuse one
// of the same numbering shapes ("A)", "a.", "1)"-"4)"), which makes a
// bare "N)" line ambiguous between "next question" and "next option" —
// resolved with two running counters while walking the text:
//   - questionNumberExpected: what the *next real question's* number
//     must be, continuing from the previous one.
//   - optionNumberExpected: what the *next option in the current
//     block* must be if it's numbered, starting at 1 per block.
// A "N)" line is an option if N matches optionNumberExpected (checked
// first, since within a block that's always tried before treating it
// as a new question); otherwise it's a new question only if N matches
// questionNumberExpected. "Q1."/"1." (period or Q-prefixed) are
// unambiguous and always start a new question — only options ever use
// the "N)" paren form for numbers, never a bare period.
//
// A plain-prose line encountered after options have already started
// for the current block (i.e. it isn't a question start, an option
// marker, or an answer line) closes that block right there instead of
// being merged into whatever option came before it — it becomes its
// own block, which will fail to parse (no options) and surface to the
// teacher as a flagged, unparseable chunk instead of silently
// corrupting a real question's data.

export interface ParsedQuestion {
  /** Client-side only, for React keys / edits — never sent as-is. */
  clientId: string;
  prompt: string;
  options: string[];
  /** Index into options, or null if no answer marker was found. */
  correctOption: number | null;
  /** Raw pasted text for this block, shown when parseError is set. */
  rawText: string;
  /** null when parsing succeeded with reasonable confidence. */
  parseError: string | null;
}

const QUESTION_START = /^\s*(?:(Q)\.?\s*)?(\d{1,3})([.)])\s+(.*)$/i;
const OPTION_LETTER = /^\s*\*?\s*([A-Da-d])[).]\s*\*?\s*(.*?)\s*\*?\s*$/;
const OPTION_NUMBER = /^\s*\*?\s*([1-4])\)\s*\*?\s*(.*?)\s*\*?\s*$/;
const ANSWER_LINE = /^\s*(?:answer|ans)\s*[:\-]\s*(.+)$/i;

let clientIdCounter = 0;
function nextClientId() {
  clientIdCounter += 1;
  return `parsed-${Date.now()}-${clientIdCounter}`;
}

function matchOption(line: string): { text: string; starred: boolean } | null {
  const starred = /\*/.test(line);
  const letterMatch = line.match(OPTION_LETTER);
  if (letterMatch) return { text: letterMatch[2].trim(), starred };
  const numberMatch = line.match(OPTION_NUMBER);
  if (numberMatch) return { text: numberMatch[2].trim(), starred };
  return null;
}

function letterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
}

/** Splits raw pasted text into per-question line groups. See the
 * module doc comment above for the disambiguation rules. */
function splitIntoBlocks(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const blocks: string[][] = [];
  let current: string[] = [];
  let questionNumberExpected = 1;
  let optionNumberExpected = 1;
  let inOptions = false;

  function closeBlock() {
    if (current.length) blocks.push(current);
    current = [];
    optionNumberExpected = 1;
    inOptions = false;
  }

  function openBlock(line: string, nextExpected: number) {
    closeBlock();
    current = [line];
    questionNumberExpected = nextExpected;
  }

  for (const line of lines) {
    const qMatch = line.match(QUESTION_START);
    if (qMatch) {
      const n = parseInt(qMatch[2], 10);
      const unambiguous = Boolean(qMatch[1]) || qMatch[3] === ".";

      if (unambiguous) {
        openBlock(line, n + 1);
        continue;
      }
      // Ambiguous "N)" — could be the next option or the next question.
      if (current.length > 0 && n === optionNumberExpected) {
        current.push(line);
        optionNumberExpected += 1;
        inOptions = true;
        continue;
      }
      if (n === questionNumberExpected) {
        openBlock(line, n + 1);
        continue;
      }
      // Neither counter matches (out-of-sequence numbering) — best
      // effort: attach to the current block if one is open, else start
      // a new (likely-to-be-flagged) block.
      if (current.length === 0) {
        current = [line];
        questionNumberExpected = n + 1;
      } else {
        current.push(line);
      }
      continue;
    }

    // Not a numbered line — a letter option, an answer line, or prose.
    if (current.length === 0) {
      current = [line];
      continue;
    }
    if (matchOption(line) || ANSWER_LINE.test(line)) {
      current.push(line);
      inOptions = true;
      continue;
    }
    if (inOptions) {
      // Stray prose after options have already started — don't let it
      // corrupt the previous option; give it its own block instead.
      closeBlock();
      current = [line];
      continue;
    }
    // Still building a multi-line prompt.
    current.push(line);
  }
  closeBlock();

  return blocks;
}

function parseBlock(lines: string[]): ParsedQuestion {
  const rawText = lines.join("\n");
  const promptLines: string[] = [];
  const options: string[] = [];
  let correctOption: number | null = null;
  let inOptions = false;

  // Strip a leading question-number marker off the first line, if present.
  const firstLineMatch = lines[0]?.match(QUESTION_START);
  const workingLines = firstLineMatch ? [firstLineMatch[4], ...lines.slice(1)] : lines;

  for (const line of workingLines) {
    const answerMatch = line.match(ANSWER_LINE);
    if (answerMatch) {
      const raw = answerMatch[1].trim();
      if (/^[A-Da-d]$/.test(raw)) {
        correctOption = letterToIndex(raw);
      } else if (/^\d+$/.test(raw)) {
        correctOption = parseInt(raw, 10) - 1;
      } else {
        const byText = options.findIndex((o) => o.toLowerCase() === raw.toLowerCase());
        if (byText >= 0) correctOption = byText;
      }
      continue;
    }

    const opt = matchOption(line);
    if (opt) {
      inOptions = true;
      options.push(opt.text);
      if (opt.starred) correctOption = options.length - 1;
      continue;
    }

    if (!inOptions) {
      promptLines.push(line.trim());
    } else if (options.length > 0) {
      // Rare: a wrapped continuation of the previous option's text.
      options[options.length - 1] = `${options[options.length - 1]} ${line.trim()}`.trim();
    }
  }

  const prompt = promptLines.join(" ").trim();

  let parseError: string | null = null;
  if (!prompt) parseError = "No question text detected.";
  else if (options.length < 2) parseError = `Only ${options.length} option${options.length === 1 ? "" : "s"} detected — need at least 2.`;

  const correctOutOfRange = correctOption !== null && (correctOption < 0 || correctOption >= options.length);
  if (correctOutOfRange && !parseError) parseError = "Detected answer marker doesn't match any option.";

  return {
    clientId: nextClientId(),
    prompt,
    options,
    correctOption: correctOutOfRange ? null : correctOption,
    rawText,
    parseError,
  };
}

export function parseBulkQuestions(raw: string): ParsedQuestion[] {
  return splitIntoBlocks(raw).map(parseBlock);
}
