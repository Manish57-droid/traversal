import { withDefaultSteps, parseNumberList, type ConceptTopic, type Step } from "./types";

export const HASH_TABLE_SIZE = 7;

export interface HashingStepState {
  buckets: number[][];
  activeBucket: number | null;
  note: string;
}

function emptyBuckets(): number[][] {
  return Array.from({ length: HASH_TABLE_SIZE }, () => []);
}

function generateSteps(input: Record<string, string>): Step<HashingStepState>[] {
  const keys = parseNumberList(input.keys);
  const steps: Step<HashingStepState>[] = [
    {
      title: "Empty table",
      description: `A hash table with ${HASH_TABLE_SIZE} buckets. Each key maps to a bucket via key % ${HASH_TABLE_SIZE}.`,
      state: { buckets: emptyBuckets(), activeBucket: null, note: "Nothing inserted yet." },
    },
  ];

  const buckets = emptyBuckets();
  for (const key of keys) {
    const bucket = ((key % HASH_TABLE_SIZE) + HASH_TABLE_SIZE) % HASH_TABLE_SIZE;
    const collision = buckets[bucket].length > 0;
    buckets[bucket] = [...buckets[bucket], key];
    steps.push({
      title: `Insert ${key}`,
      description: collision
        ? "Collision — another key already hashed here, so this one is chained onto the same bucket."
        : "Compute the hash, then drop the key straight into that bucket.",
      state: {
        buckets: buckets.map((b) => [...b]),
        activeBucket: bucket,
        note: `hash(${key}) = ${key} % ${HASH_TABLE_SIZE} = ${bucket}${collision ? ` — bucket ${bucket} already has [${buckets[bucket].slice(0, -1).join(", ")}], chaining.` : ` — bucket ${bucket}.`}`,
      },
    });
  }

  if (keys.length === 0) {
    steps.push({ title: "Nothing to insert", description: "Enter at least one key.", state: { buckets: emptyBuckets(), activeBucket: null, note: "No keys given." } });
  }

  return steps;
}

export const hashingTopic: ConceptTopic<HashingStepState> = withDefaultSteps({
  slug: "hashing",
  title: "Hashing",
  summary: "A hash function maps keys to buckets — collisions get chained onto the same bucket.",
  theory: {
    definition:
      "A hash table stores key-value pairs in an array of buckets, using a hash function (here, key % table size) to decide which bucket a key belongs to. Two keys landing in the same bucket is a collision, resolved here by chaining — each bucket holds a small list.",
    operations: [
      { name: "Insert", complexity: "O(1) average, O(n) worst case" },
      { name: "Lookup", complexity: "O(1) average, O(n) worst case" },
      { name: "Delete", complexity: "O(1) average, O(n) worst case" },
    ],
    useCases: [
      "Dictionaries / maps / objects in most languages",
      "Caches — mapping a key straight to its cached value",
      "Deduplication — has this value been seen before?",
      "Database indexing for exact-match lookups",
    ],
  },
  inputFields: [
    { key: "keys", label: "Keys to insert", type: "numberList", placeholder: "10, 22, 31, 4, 15, 28, 17", help: "Comma-separated numbers, inserted in order." },
  ],
  defaultInput: { keys: "10, 22, 31, 4, 15, 28, 17" },
  generateSteps,
  quiz: [
    {
      question: "What is a hash collision?",
      options: [
        "When the hash function crashes",
        "When two different keys map to the same bucket",
        "When a key is inserted twice",
        "When the table runs out of memory",
      ],
      correctIndex: 1,
    },
    {
      question: "Why is average-case lookup O(1) but worst-case O(n)?",
      options: [
        "It's always O(1) — there is no worst case",
        "A good hash function spreads keys evenly, but if many keys collide into one bucket, that bucket becomes a long chain to search",
        "Worst case only happens with negative numbers",
        "The table resizes itself to avoid this",
      ],
      correctIndex: 1,
    },
    {
      question: "Chaining resolves a collision by:",
      options: [
        "Overwriting the existing key",
        "Rejecting the new key",
        "Keeping a small list of all keys that hashed to that bucket",
        "Doubling the table size immediately",
      ],
      correctIndex: 2,
    },
  ],
});
