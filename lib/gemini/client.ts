import { GoogleGenAI } from "@google/genai";

// gemini-3.5-flash is currently returning 503 "high demand" errors with
// 14-35s latency even on success. gemini-3.1-flash-lite responds correctly
// in well under a second and is more than capable for tutoring Q&A and
// scope classification — worth the tradeoff for a responsive chat UI.
export const CHAT_MODEL = "gemini-3.1-flash-lite";

let client: GoogleGenAI | null = null;

// Lazy singleton — constructing without an API key doesn't throw immediately
// (unlike the Anthropic SDK), but we still gate here so every caller gets
// the same clear error instead of a confusing downstream 401.
export function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it in .env.local to enable the AI help chatbot.",
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}
