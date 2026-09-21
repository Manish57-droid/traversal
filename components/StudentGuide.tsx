"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  Code2,
  LayoutDashboard,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

// Hand-drawn mascot avatar — fixed colors regardless of light/dark
// theme (an illustration, not a themed UI surface), sized to fill
// whatever circular badge it's placed in.
function MascotFace({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Piku, your AI study buddy">
      <circle cx="50" cy="50" r="50" fill="#F6D9C4" />
      {/* hair back */}
      <path d="M12 46c0-24 17-38 38-38s38 14 38 38c0 6-1 11-3 15-3-10-9-16-17-16H32c-8 0-14 6-17 16-2-4-3-9-3-15z" fill="#5B3A29" />
      {/* buns */}
      <circle cx="14" cy="48" r="10" fill="#5B3A29" />
      <circle cx="86" cy="48" r="10" fill="#5B3A29" />
      {/* face */}
      <path d="M27 44c0-14 10-24 23-24s23 10 23 24v6c0 15-10 27-23 27s-23-12-23-27v-6z" fill="#FBE3CE" />
      {/* hair fringe */}
      <path d="M27 44c3-9 11-15 23-15s20 6 23 15c-2-3-6-5-11-5-4 0-6 2-12 2s-8-2-12-2c-5 0-9 2-11 5z" fill="#5B3A29" />
      {/* blush */}
      <circle cx="33" cy="58" r="4" fill="#F4A896" opacity="0.7" />
      <circle cx="67" cy="58" r="4" fill="#F4A896" opacity="0.7" />
      {/* eyes */}
      <circle cx="40" cy="52" r="3.2" fill="#3A2A20" />
      <circle cx="60" cy="52" r="3.2" fill="#3A2A20" />
      <circle cx="41.2" cy="50.8" r="1" fill="#fff" />
      <circle cx="61.2" cy="50.8" r="1" fill="#fff" />
      {/* smile */}
      <path d="M41 63c3 3 6 4.5 9 4.5s6-1.5 9-4.5" stroke="#B4654A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* bow */}
      <path d="M83 40l7-4v8z" fill="#D9824C" />
      <path d="M83 40l-7-4v8z" fill="#D9824C" />
      <circle cx="83" cy="40" r="2.5" fill="#B05C2A" />
    </svg>
  );
}

interface QuickLink {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
}

const QUICK_LINKS: QuickLink[] = [
  { href: "/student/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/student/dsa", icon: Code2, label: "DSA" },
  { href: "/student/aptitude", icon: Brain, label: "Aptitude" },
  { href: "/student/proctored-tests", icon: ShieldCheck, label: "Proctored Tests" },
  { href: "/student/classes", icon: Users, label: "My Classes" },
  { href: "/student/study-material", icon: BookOpen, label: "Study Material" },
];

interface ChatImage {
  dataUrl: string;
  alt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: ChatImage[];
  error?: boolean;
}

// Turns Piku's markdown-ish replies into React nodes — headers, bold,
// inline code, fenced code blocks, and bullet/numbered lists. Not a
// full CommonMark implementation, just enough for the structured
// explanations the system prompt asks Claude for (see
// app/api/piku/chat/route.ts).
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`${keyPrefix}-${i}`} className="rounded bg-surface-2 px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

function renderMarkdown(text: string): ReactNode[] {
  const lines = text.split("\n");
  const nodes: ReactNode[] = [];
  let i = 0;
  let listBuffer: { ordered: boolean; items: string[] } | null = null;

  function flushList() {
    if (!listBuffer) return;
    const ListTag = listBuffer.ordered ? "ol" : "ul";
    nodes.push(
      <ListTag key={`list-${nodes.length}`} className={`ml-4 space-y-0.5 ${listBuffer.ordered ? "list-decimal" : "list-disc"}`}>
        {listBuffer.items.map((item, idx) => (
          <li key={idx}>{renderInline(item, `li-${nodes.length}-${idx}`)}</li>
        ))}
      </ListTag>
    );
    listBuffer = null;
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      flushList();
      nodes.push(
        <pre key={`code-${nodes.length}`} className="overflow-x-auto rounded-lg bg-surface-2 p-2.5 text-xs">
          <code className={lang ? `language-${lang}` : undefined}>{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const sizeClass = level <= 2 ? "text-sm font-semibold" : "text-sm font-medium";
      nodes.push(
        <p key={`h-${nodes.length}`} className={`${sizeClass} text-fg`}>
          {renderInline(headingMatch[2], `h-${nodes.length}`)}
        </p>
      );
      i++;
      continue;
    }

    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    const orderedMatch = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bulletMatch || orderedMatch) {
      const ordered = !!orderedMatch;
      const item = (bulletMatch ?? orderedMatch)![1];
      if (!listBuffer || listBuffer.ordered !== ordered) {
        flushList();
        listBuffer = { ordered, items: [] };
      }
      listBuffer.items.push(item);
      i++;
      continue;
    }

    flushList();
    if (line.trim()) {
      nodes.push(
        <p key={`p-${nodes.length}`} className="leading-relaxed">
          {renderInline(line, `p-${nodes.length}`)}
        </p>
      );
    }
    i++;
  }
  flushList();
  return nodes;
}

export default function StudentGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // The take screen goes fullscreen on document.documentElement (see
  // app/student/proctored-tests/[testId]/take/page.tsx) — since this
  // widget lives in the layout wrapping every student page, it would
  // otherwise still float on top of a monitored, supposed-to-be-
  // distraction-free exam. Everywhere else it's fine.
  if (pathname.includes("/proctored-tests/") && pathname.endsWith("/take")) return null;

  async function handleSend(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    const history = [...messages, { role: "user" as const, content: question }];
    setMessages(history);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/piku/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Piku couldn't answer that.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, images: data.images }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: err.message, error: true }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="card flex h-[32rem] w-[22rem] flex-col overflow-hidden shadow-lg sm:w-96">
          <div className="flex items-center justify-between gap-2 border-b border-line/70 p-3">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-accent/30">
                <MascotFace className="h-full w-full" />
              </div>
              <div>
                <p className="text-sm font-medium text-fg">Piku</p>
                <p className="text-xs text-fg-subtle">Your AI study buddy</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Piku" className="shrink-0 text-fg-subtle hover:text-fg">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-b border-line/70 p-2">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-line/70 px-2.5 py-1 text-xs text-fg-muted transition-colors hover:border-accent/50 hover:text-fg"
              >
                <l.icon className="h-3 w-3" />
                {l.label}
              </Link>
            ))}
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="flex items-start gap-2">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                  <MascotFace className="h-full w-full" />
                </div>
                <div className="rounded-lg rounded-tl-none bg-surface-2 px-3 py-2 text-sm text-fg">
                  Hi, I'm Piku! Ask me about DSA, aptitude, interview prep, or how to use Traversal — I'll explain in
                  detail and draw a diagram when it helps.
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                    <MascotFace className="h-full w-full" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] space-y-1.5 rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "rounded-tr-none bg-accent text-ink-fixed"
                      : m.error
                        ? "rounded-tl-none border border-warn/40 bg-warn/10 text-warn"
                        : "rounded-tl-none bg-surface-2 text-fg"
                  }`}
                >
                  {m.role === "user" ? m.content : <div className="space-y-1.5">{renderMarkdown(m.content)}</div>}
                  {m.images?.map((img, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={img.dataUrl} alt={img.alt} className="mt-1 max-w-full rounded-lg border border-line/70" />
                  ))}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-start gap-2">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full">
                  <MascotFace className="h-full w-full" />
                </div>
                <div className="rounded-lg rounded-tl-none bg-surface-2 px-3 py-2 text-sm text-fg-muted">
                  Piku is thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="flex items-center gap-2 border-t border-line/70 p-2.5"
          >
            <input
              className="input"
              placeholder="Ask Piku anything…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="btn-primary shrink-0 px-3 py-2.5"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Piku" : "Open Piku, your AI study buddy"}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full border border-line/70 bg-surface shadow-lg transition-transform hover:scale-105"
      >
        <MascotFace className="h-full w-full rounded-full" />
        {!open && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink-fixed">
            <Sparkles className="h-3 w-3" />
          </span>
        )}
      </button>
    </div>
  );
}
