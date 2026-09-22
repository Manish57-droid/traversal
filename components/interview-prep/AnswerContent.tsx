"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MermaidDiagram from "./MermaidDiagram";

// Renders a topic's `answer` text (Markdown, optionally with one or
// more ```mermaid fenced diagrams) with theme-matched styling. Used by
// both the student reading view and the teacher's live preview, so
// what a teacher sees while writing is exactly what a student gets.
export default function AnswerContent({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-fg-muted [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h3 className="mt-4 text-base font-semibold text-fg">{children}</h3>,
          h2: ({ children }) => <h3 className="mt-4 text-base font-semibold text-fg">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-3 text-sm font-semibold text-fg">{children}</h4>,
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
          em: ({ children }) => <em className="text-fg">{children}</em>,
          ul: ({ children }) => <ul className="ml-4 list-disc space-y-1 marker:text-fg-subtle">{children}</ul>,
          ol: ({ children }) => <ol className="ml-4 list-decimal space-y-1 marker:text-fg-subtle">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-line/60">
              <table className="w-full min-w-[400px] border-collapse text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
          th: ({ children }) => <th className="border-b border-line/60 px-3 py-2 text-left font-medium text-fg">{children}</th>,
          td: ({ children }) => <td className="border-b border-line/40 px-3 py-2">{children}</td>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/50 pl-3 text-fg-subtle">{children}</blockquote>
          ),
          hr: () => <hr className="border-line/60" />,
          code(props) {
            const { className, children, ...rest } = props as {
              className?: string;
              children?: React.ReactNode;
            };
            const match = /language-(\w+)/.exec(className || "");
            const text = String(children ?? "").replace(/\n$/, "");

            if (match?.[1] === "mermaid") {
              return <MermaidDiagram chart={text} />;
            }
            if (match) {
              return (
                <pre className="overflow-x-auto rounded-lg border border-line/60 bg-surface-2 p-3 text-xs">
                  <code>{text}</code>
                </pre>
              );
            }
            return (
              <code className="rounded bg-surface-2 px-1 py-0.5 text-xs" {...rest}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
