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
  {
    slug: "python",
    name: "Python",
    description: "Python 3 from strings and numbers to functions, data structures, comprehensions, OOP, exceptions, files, decorators and the GIL — every example run with its real output.",
    icon: "Terminal",
  },
  {
    slug: "java",
    name: "Java",
    description: "Core Java to advanced: OOP, strings, collections and HashMap internals, Java 8 streams, threads and concurrency, I/O, JDBC, RMI, servlets — every example compiled and run.",
    icon: "Coffee",
  },
  {
    slug: "networking",
    name: "Computer Networks",
    description: "From topologies and the OSI model to routing, TCP congestion control, DNS and HTTP — with worked calculations.",
    icon: "Network",
  },
  {
    slug: "os",
    name: "Operating Systems",
    description: "Processes, threads, synchronization, CPU scheduling, deadlocks, memory and virtual memory, file systems and security — with worked numerical examples.",
    icon: "Cpu",
  },
  {
    slug: "dbms",
    name: "DBMS",
    description: "Relational model, keys, relational algebra, ER diagrams, normalization up to 5NF, transactions, concurrency, recovery and indexing.",
    icon: "Database",
  },
  {
    slug: "sql",
    name: "SQL",
    description: "SQL from CREATE TABLE to joins, subqueries and window functions, plus views, transactions and PL/SQL — every query shown with its real output.",
    icon: "FileCode",
  },
];

export const lastTopicKey = (guideSlug: string) => `interview-guide:last-topic:${guideSlug}`;
