import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { geminiClient } from "@/lib/gemini";
import type { Content } from "@google/genai";

// Piku's persona and scope. Told to reach for the code_execution tool
// (matplotlib/networkx, run server-side by Gemini) whenever a diagram
// would make an explanation clearer, rather than describing a visual
// in words only — that's where the "explained through images"
// behavior comes from; the tool itself is declared below, not in the
// prompt. Free-tier model (see lib/gemini.ts) — no billing involved.
const SYSTEM_PROMPT = `You are Piku, a friendly AI study buddy built into the Traversal platform for students preparing for coding interviews and campus placements.

Scope: Data Structures & Algorithms, competitive programming, aptitude/quantitative and logical reasoning, interview-prep subjects (OOP, DBMS, Operating Systems, Networking, System Design, and languages like C++/Java/Python/JavaScript/SQL), and how to use the Traversal platform itself (its DSA sheet, Aptitude practice, Proctored Tests, Study Material, and My Classes sections). Brief friendly small talk is fine; for anything clearly outside this scope, gently say so and steer back to what you can help with.

Explanation style:
- Be warm, encouraging, and patient — many students are still building confidence.
- Structure detailed answers with markdown: "##" headers, "**bold**" for key terms, bullet/numbered lists, and fenced code blocks (with a language tag) for any code.
- Whenever a diagram would make a concept clearer — a tree, graph, linked list, array/pointer walkthrough, sorting/searching steps, a recursion tree, a time-complexity growth chart — use the code execution tool to draw it with matplotlib (networkx for graphs/trees) and display it, instead of describing the picture in words only.
- Keep code examples short, runnable, and idiomatic.
- Match depth to the question: a quick definition can be a few lines, but a "explain X" or "how does X work" question deserves a full, structured explanation.`;

const MODEL = "gemini-flash-latest";
const MAX_HISTORY = 16;
const MAX_ATTEMPTS = 3;

interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Gemini's free-tier model occasionally returns a transient
// "high demand" 503 (confirmed live — the same request succeeded on
// retry seconds later). Retried here rather than surfaced as an
// error, so a passing overload is invisible to the student.
function isRetryable(err: any) {
  return err?.status === 503 || err?.status === "UNAVAILABLE";
}

export async function POST(req: Request) {
  const user = await requireRole(["student"]).catch(() => null);
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const rawMessages: ChatMessageInput[] = body?.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 });
  }

  const trimmed = rawMessages
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_HISTORY);
  if (trimmed.length === 0 || trimmed[trimmed.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be from the user." }, { status: 400 });
  }

  let ai: ReturnType<typeof geminiClient>;
  try {
    ai = geminiClient();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  // Gemini uses 'model' where Claude/OpenAI-style APIs use 'assistant'.
  const contents: Content[] = trimmed.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    let response;
    for (let attempt = 1; ; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: MODEL,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ codeExecution: {} }],
            maxOutputTokens: 4096,
          },
        });
        break;
      } catch (err) {
        if (attempt >= MAX_ATTEMPTS || !isRetryable(err)) throw err;
        await sleep(1500 * attempt);
      }
    }

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    if (finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT" || finishReason === "BLOCKLIST") {
      return NextResponse.json({
        reply: "I'm not able to help with that one — want to ask something else about DSA, aptitude, or interview prep?",
        images: [],
      });
    }

    let reply = "";
    const images: { dataUrl: string; alt: string }[] = [];

    for (const part of candidate?.content?.parts ?? []) {
      if (part.text && !part.thought) {
        reply += part.text;
      } else if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
        images.push({ dataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`, alt: "diagram" });
      }
    }

    if (!reply.trim() && images.length === 0) {
      reply = "Hmm, I didn't manage to put together an answer for that — could you rephrase it?";
    }

    return NextResponse.json({ reply: reply.trim(), images });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Something went wrong talking to Piku." }, { status: 500 });
  }
}
