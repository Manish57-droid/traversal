"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";
import MermaidDiagram from "./MermaidDiagram";

const LANGUAGE_LABELS: Record<string, string> = { cpp: "C++", c: "C", text: "Output" };

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const isOutput = language === "text";

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure context, permissions) — the
      // code is still selectable by hand, so just do nothing.
    }
  }

  return (
    <div className={`my-5 overflow-hidden rounded-xl border ${isOutput ? "border-success/30" : "border-line/70"}`}>
      <div
        className={`flex items-center justify-between border-b px-4 py-1.5 text-xs ${
          isOutput ? "border-success/20 bg-success/10 text-success" : "border-line/60 bg-surface-2 text-fg-subtle"
        }`}
      >
        <span className="font-medium uppercase tracking-wide">{LANGUAGE_LABELS[language] ?? language}</span>
        {!isOutput && (
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            aria-label="Copy code"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <pre className={`overflow-x-auto p-4 text-[13px] leading-6 ${isOutput ? "bg-success/5 text-fg" : "bg-surface text-fg"}`}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Long-form reading renderer for the static Interview Prep guides
// (lib/interview-guides). Same Markdown dialect as AnswerContent — GFM
// plus ```mermaid diagrams — but laid out for reading one topic per
// page: larger type, labelled code/output panels with copy, callout
// blockquotes, and internal links that stay in the same tab.
export default function GuideArticle({ content }: { content: string }) {
  return (
    <article className="text-[15px] leading-7 text-fg-muted [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="mb-3 mt-10 font-display text-xl text-fg">{children}</h2>,
          h2: ({ children }) => <h2 className="mb-3 mt-10 font-display text-xl text-fg">{children}</h2>,
          h3: ({ children }) => (
            <h3 className="mb-3 mt-9 border-b border-line/60 pb-2 font-display text-lg text-fg">{children}</h3>
          ),
          p: ({ children }) => <p className="my-4">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
          em: ({ children }) => <em className="text-fg">{children}</em>,
          ul: ({ children }) => <ul className="my-4 ml-5 list-disc space-y-2 marker:text-accent">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 ml-5 list-decimal space-y-2 marker:text-fg-subtle">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ children, href }) =>
            href?.startsWith("/") ? (
              <Link href={href} className="text-accent underline underline-offset-2">
                {children}
              </Link>
            ) : (
              <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
                {children}
              </a>
            ),
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-line/70">
              <table className="w-full min-w-[480px] border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
          th: ({ children }) => <th className="border-b border-line/70 px-3 py-2 text-left font-medium text-fg">{children}</th>,
          td: ({ children }) => <td className="border-b border-line/40 px-3 py-2 align-top">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="my-5 rounded-r-xl border-l-4 border-accent bg-accent/5 px-4 py-1 text-fg">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-8 border-line/60" />,
          // Fenced blocks are rendered whole by `code` below.
          pre: ({ children }) => <>{children}</>,
          code(props) {
            const { className, children } = props as { className?: string; children?: React.ReactNode };
            const raw = String(children ?? "");
            const language = /language-(\w+)/.exec(className || "")?.[1];

            if (language === "mermaid") return <MermaidDiagram chart={raw} />;
            if (language || raw.includes("\n")) {
              return <CodeBlock language={language ?? "code"} code={raw.replace(/\n$/, "")} />;
            }
            return (
              <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[13px] text-fg">{children}</code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
