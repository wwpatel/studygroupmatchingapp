import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

// Lazy singleton — constructing Anthropic() throws synchronously when no API
// key is configured, so we defer that to first use inside a request instead
// of at module import time (which would crash every route that merely
// imports this file, including ones with no AI dependency).
export function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in .env.local to enable AI features.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
