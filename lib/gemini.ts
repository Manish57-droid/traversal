import { GoogleGenAI } from "@google/genai";

// Server-only client for Piku (the student-facing AI helper — see
// app/api/piku/chat/route.ts). Gemini over Claude specifically
// because it has a real, sustained free tier — no card, no bill.
// Never import this into a client component; the API key must stay
// server-side.
export function geminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (and to your hosting provider's env vars) — get a free key from https://aistudio.google.com/apikey."
    );
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}
