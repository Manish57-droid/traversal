// Content for the "Topics" reading section — each topic pairs a short
// theory write-up with an interactive, input-driven 3D walkthrough
// (ConceptPlayer drives the animation; the actual algorithm logic and
// content live in the per-topic files below) and a 3-question recap
// quiz. No DB table: this is authored content, not user data.

export type {
  ConceptTheory,
  QuizQuestion,
  Step,
  TopicInput,
  InputFieldSpec,
  ConceptTopic,
} from "./types";

export { arrayTopic, type ArrayStepState } from "./array";
export { stringTopic, type StringStepState } from "./string";
export { hashingTopic, type HashingStepState } from "./hashing";
export { linkedListTopic, type LinkedListStepState } from "./linkedList";
export { stackTopic, type StackStepState } from "./stack";
export { queueTopic, type QueueStepState } from "./queue";
export { treeTopic, type TreeStepState } from "./tree";
export { graphTopic, type GraphStepState } from "./graph";

import { arrayTopic } from "./array";
import { stringTopic } from "./string";
import { hashingTopic } from "./hashing";
import { linkedListTopic } from "./linkedList";
import { stackTopic } from "./stack";
import { queueTopic } from "./queue";
import { treeTopic } from "./tree";
import { graphTopic } from "./graph";

// Order matches the "Data Structures" list this was built from: Array,
// String, Hashing, Linked List, Stack, Queue, Tree, Graph.
export const CONCEPT_TOPICS = [
  arrayTopic,
  stringTopic,
  hashingTopic,
  linkedListTopic,
  stackTopic,
  queueTopic,
  treeTopic,
  graphTopic,
];
