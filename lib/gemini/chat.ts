import { getGeminiClient, CHAT_MODEL } from "./client";

// Exact string the model (and our backend fallback) must use for anything
// outside academic help. Checked verbatim in a couple of places below —
// keep this the single source of truth.
export const REFUSAL_MESSAGE = "Sorry, I can't help you with that.";

export const ACADEMIC_SYSTEM_PROMPT = `You are Nova, an AI study tutor for high school students. You help ONLY with schoolwork and studying: homework help, concept explanations, quiz/test prep, study strategies, and closely related academic topics.

Scope rule (must follow exactly): if the student's message is not academic help — personal topics, relationships, mental health, general chit-chat, opinions on unrelated topics, or anything outside schoolwork/studying — you must respond with EXACTLY this text and nothing else: "${REFUSAL_MESSAGE}"
Do not soften it, explain why, or add anything before or after it. Do not answer even a small part of an off-topic request.

For genuine academic questions:
1. When the question is broad, ambiguous, or could stem from several different misunderstandings, ask ONE short, targeted diagnostic question first to locate exactly where their understanding breaks down (e.g. "Before I explain — when you set up the equation, what did you get for the first step?"). Keep it to a single question, not a list.
2. Once you know exactly where the gap is (from their diagnostic answer, or because the question was already specific enough), explain clearly and concisely at that specific point of confusion — don't re-teach the whole topic from scratch.
3. Skip the diagnostic question when the question is already precise (e.g. "What's the derivative of x^3?") or factual/definitional. Use judgment — the goal is to save the student's time, not interrogate them.
4. Use markdown for structure. Use LaTeX ($...$ or $$...$$) for math and fenced code blocks for code.
5. Be warm, encouraging, and concise. Avoid long lectures.`;

const CLASSIFIER_SYSTEM_PROMPT = `You are a strict content classifier for a high school study app's chatbot. Classify the user's message into exactly one category based on whether it is asking for help with schoolwork or studying (homework help, concept explanations, quiz/test prep, study strategies, or closely related academic topics).

Respond with EXACTLY one word, nothing else:
- ACADEMIC — if it's schoolwork/studying help, including a short diagnostic follow-up answer within an ongoing tutoring conversation.
- OFF_TOPIC — for anything else: personal topics, relationships, mental health, general chit-chat, opinions unrelated to schoolwork, or anything not about studying.

When in doubt, prefer OFF_TOPIC.`;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function toGeminiContents(turns: ChatTurn[]) {
  return turns.map((t) => ({
    role: t.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: t.content }],
  }));
}

/**
 * Backend-enforced scope gate, independent of the main chat model's own
 * judgment. Runs as a separate, narrowly-scoped classification call so an
 * off-topic message never reaches (or can steer) the main tutoring prompt.
 * Fails closed: any error or unparseable output is treated as OFF_TOPIC.
 */
export async function classifyMessage(message: string): Promise<"ACADEMIC" | "OFF_TOPIC"> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: [{ role: "user", parts: [{ text: message }] }],
      config: {
        systemInstruction: CLASSIFIER_SYSTEM_PROMPT,
        maxOutputTokens: 20,
        temperature: 0,
        // Thinking defaults to automatic budget on this model tier, which
        // was silently consuming the entire (tiny) token budget for this
        // trivial classification and leaving none for the actual verdict.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const verdict = (response.text ?? "").trim().toUpperCase();
    if (verdict.includes("ACADEMIC")) return "ACADEMIC";
    if (verdict.includes("OFF_TOPIC")) return "OFF_TOPIC";
    console.warn(`[gemini] scope classifier returned unparseable output: ${JSON.stringify(verdict)} — failing closed to OFF_TOPIC`);
    return "OFF_TOPIC";
  } catch (err) {
    console.error("[gemini] scope classifier call failed — failing closed to OFF_TOPIC", err);
    return "OFF_TOPIC";
  }
}

export async function* streamAcademicReply(
  history: ChatTurn[],
  message: string,
  material?: { title: string; subject: string; content: string } | null,
) {
  const ai = getGeminiClient();
  const contents = [...toGeminiContents(history), { role: "user" as const, parts: [{ text: message }] }];

  const systemInstruction = material
    ? `${ACADEMIC_SYSTEM_PROMPT}\n\nThe student is currently asking about this uploaded course material — ground your answers in it and quote/reference it directly where relevant. If the question can't be answered from this material, say so and answer from general knowledge instead.\n\nMaterial: "${material.title}" (${material.subject})\n---\n${material.content.slice(0, 12000)}\n---`
    : ACADEMIC_SYSTEM_PROMPT;

  const stream = await ai.models.generateContentStream({
    model: CHAT_MODEL,
    contents,
    config: {
      systemInstruction,
      maxOutputTokens: 2048,
      // Keep the tutoring chat snappy — thinking adds meaningful latency
      // per turn and isn't needed for the level of reasoning this requires.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.text ?? "";
    if (!delta) continue;
    full += delta;
    yield delta;
  }

  // Defense-in-depth: the classifier already gated this call, but log if the
  // model produced a refusal-shaped reply that doesn't match the required
  // string verbatim — that's a sign of prompt drift worth investigating.
  const trimmed = full.trim();
  if (trimmed && trimmed.toLowerCase().startsWith("sorry, i can't help") && trimmed !== REFUSAL_MESSAGE) {
    console.warn(
      `[gemini] model emitted a refusal-shaped reply that didn't match the exact required string: ${JSON.stringify(trimmed.slice(0, 120))}`,
    );
  }
}
