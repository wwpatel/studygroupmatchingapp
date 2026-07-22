import { Type, type Schema } from "@google/genai";
import { getGeminiClient, CHAT_MODEL } from "./client";
import { generateStructured } from "./generate";

// Exact string the model (and our backend fallback) must use for anything
// outside academic help. Checked verbatim in a couple of places below —
// keep this the single source of truth.
export const REFUSAL_MESSAGE = "Sorry, I can't help you with that.";

export const ACADEMIC_SYSTEM_PROMPT = `You are Nova, an AI study tutor for high school students. You help ONLY with schoolwork and studying: homework help, concept explanations, quiz/test prep, study strategies, and closely related academic topics.

Scope rule (must follow exactly): if the student's message is not academic help — personal topics, relationships, mental health, general chit-chat, opinions on unrelated topics, or anything outside schoolwork/studying — you must respond with EXACTLY this text and nothing else: "${REFUSAL_MESSAGE}"
Do not soften it, explain why, or add anything before or after it. Do not answer even a small part of an off-topic request.
Important: questions about the student's OWN studying and coursework are always in scope — this includes asking what to review, for a study plan, how to prepare for a test, or to recall/continue an earlier academic conversation (e.g. "remind me what I was struggling with", "what should I focus on for my test", "recap what we were working on"). Treat those as academic help and answer them — never use the refusal string for them.

You are a tutor, not a homework-completion service. Your role is to help students understand and produce their OWN work — never to hand them finished work they can submit as their own. This principle applies to every academic response. It is SEPARATE from the scope rule above: a request like "write my essay" or "do my homework" IS on-topic academic help, so you must NOT use the refusal string for it — instead, help the student do the work themselves as described below.

Never write a student's assignment for them. If the student asks you to produce a complete piece of work — "write me an essay/paragraph/report on X", "do my homework", "write my [assignment]", "just give me something I can turn in" — do NOT write the finished text. Instead:
- State plainly that you can't write it for them but you can help them build it themselves, e.g. "I can't write this for you, but I can help you build it yourself."
- Then give a concrete framework tailored to what they asked about. For an essay, coach them through: developing a thesis, outlining the structure of their argument, how to find and use evidence, and how to build a strong paragraph (e.g. claim → evidence → explanation). Then hand the next step back to them (e.g. "What's your rough thesis? Share it and I'll help you sharpen it.").
- A SHORT illustrative example of a technique is fine (e.g. one sample topic sentence to show the pattern), but never write the actual paragraphs, sections, or full solution that make up their assignment.

For math and problem-solving questions, always teach the method with a FULL worked explanation — show every step and the reasoning behind it, never just the final answer. Do not reply with only the final number or result, even if the student asks for "just the answer." After the worked solution, end with EITHER a similar practice problem for the student to try themselves OR a quick check-for-understanding question, so they practice the skill instead of copying the answer.

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

const QUIZ_INTENT_SYSTEM_PROMPT = `You are a strict intent detector for a high school study app's chatbot. Decide whether the student's latest message is asking to be quizzed/tested/given practice questions or flashcards right now (e.g. "quiz me on this", "make me a practice quiz on photosynthesis", "test me on chapter 4", "give me some practice questions", "make me flashcards on cell organelles"). Use the recent conversation history for context if the request refers back to something already being discussed (e.g. "quiz me on that").

If an "active material" is provided below, the student is currently viewing/chatting about it — treat any reference to "this", "this material", "this chapter", "what we're discussing", etc. as referring to it, and set matchedMaterialId to its id.

Otherwise, if the student has a course material list provided below, and the requested topic clearly matches one of those materials (by title or subject), set matchedMaterialId to that material's id. Otherwise set it to null — do not guess a loose match.

If wantsQuiz is true, also infer:
- kind: "flashcards" if they asked for flashcards/cards to review, "test" if they asked for a full/long/practice test, otherwise "quiz"
- topic: the specific topic/subject to quiz on, inferred from their message or recent history. Leave empty ONLY if truly no topic can be inferred at all.
- subject: the general school subject this falls under (e.g. "Biology", "Algebra II", "US History")

If wantsQuiz is false, leave kind, topic, subject as empty strings and matchedMaterialId as null.`;

const quizIntentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    wantsQuiz: { type: Type.BOOLEAN },
    kind: { type: Type.STRING, format: "enum", enum: ["quiz", "test", "flashcards"] },
    topic: { type: Type.STRING },
    subject: { type: Type.STRING },
    matchedMaterialId: { type: Type.STRING, nullable: true },
  },
  required: ["wantsQuiz", "kind", "topic", "subject", "matchedMaterialId"],
  propertyOrdering: ["wantsQuiz", "kind", "topic", "subject", "matchedMaterialId"],
};

export interface QuizIntent {
  wantsQuiz: boolean;
  kind: "quiz" | "test" | "flashcards";
  topic: string;
  subject: string;
  matchedMaterialId: string | null;
}

/**
 * Detects whether the student is asking to be quizzed right now, and if so,
 * what topic/subject and (if it clearly matches an uploaded material) which
 * material to ground it in. Fails closed to wantsQuiz: false on any error, so
 * a detection failure just falls through to a normal chat reply.
 */
export async function detectQuizIntent(
  message: string,
  history: ChatTurn[],
  materials: { id: string; title: string; subject: string }[],
  activeMaterial?: { id: string; title: string; subject: string } | null,
): Promise<QuizIntent> {
  const fallback: QuizIntent = { wantsQuiz: false, kind: "quiz", topic: "", subject: "", matchedMaterialId: null };
  try {
    const recentContext = history
      .slice(-6)
      .map((t) => `${t.role === "user" ? "Student" : "Nova"}: ${t.content}`)
      .join("\n");
    const materialList = materials.length
      ? materials.map((m) => `- id: ${m.id}, title: "${m.title}", subject: ${m.subject}`).join("\n")
      : "(none uploaded)";
    const activeMaterialLine = activeMaterial
      ? `Active material: id: ${activeMaterial.id}, title: "${activeMaterial.title}", subject: ${activeMaterial.subject}`
      : "Active material: (none — the student is not currently viewing a specific material)";

    const userPrompt = `${activeMaterialLine}\n\nRecent conversation:\n${recentContext || "(none)"}\n\nStudent's course materials:\n${materialList}\n\nLatest message: "${message}"`;

    const result = await generateStructured<QuizIntent>(
      QUIZ_INTENT_SYSTEM_PROMPT,
      userPrompt,
      quizIntentSchema,
      512,
    );
    return result;
  } catch (err) {
    console.error("[gemini] quiz-intent detection failed — falling back to normal chat reply", err);
    return fallback;
  }
}

export async function* streamAcademicReply(
  history: ChatTurn[],
  message: string,
  material?: { title: string; subject: string; content: string } | null,
  studentContext?: string | null,
) {
  const ai = getGeminiClient();
  const contents = [...toGeminiContents(history), { role: "user" as const, parts: [{ text: message }] }];

  let systemInstruction = material
    ? `${ACADEMIC_SYSTEM_PROMPT}\n\nThe student is currently asking about this uploaded course material — ground your answers in it and quote/reference it directly where relevant. If the question can't be answered from this material, say so and answer from general knowledge instead.\n\nMaterial: "${material.title}" (${material.subject})\n---\n${material.content.slice(0, 12000)}\n---`
    : ACADEMIC_SYSTEM_PROMPT;

  // Long-term memory from earlier sessions (a condensed summary maintained by
  // summarizeStudentContext). Use it for continuity/personalization; don't
  // recite it back verbatim.
  if (studentContext && studentContext.trim()) {
    systemInstruction += `\n\nWhat you remember about this student from earlier sessions (use it to personalize your help and keep continuity — refer to it naturally, don't recite it back):\n${studentContext.trim()}`;
  }

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

/**
 * Fold a batch of older conversation turns into a compact, durable "memory"
 * of a single student, merging with whatever summary already exists. Used to
 * keep long-term context without stuffing the entire transcript into every
 * request (or truncating and losing it). Returns the updated summary text.
 */
export async function summarizeStudentContext(
  priorSummary: string | null,
  olderTurns: ChatTurn[],
): Promise<string> {
  const fallback = (priorSummary ?? "").trim();
  if (olderTurns.length === 0) return fallback;

  const ai = getGeminiClient();
  const transcript = olderTurns
    .map((t) => `${t.role === "user" ? "Student" : "Nova"}: ${t.content}`)
    .join("\n");

  const system = `You maintain a concise, running memory of a single high school student for their AI study tutor (Nova). Given the existing memory and a batch of older conversation turns, produce an UPDATED memory: a compact set of short bullet points capturing durable, useful facts — subjects and topics they're studying, concepts they've struggled with or mastered, recurring goals, upcoming tests/deadlines, and clear preferences. Merge new information with the existing memory; drop anything stale or contradicted. Keep it under ~180 words. Exclude one-off chit-chat and pleasantries. Output ONLY the memory notes, with no preamble.`;

  const userPrompt = `Existing memory:\n${fallback || "(none yet)"}\n\nOlder conversation turns to fold in:\n${transcript}`;

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: system,
      maxOutputTokens: 400,
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return (response.text ?? "").trim() || fallback;
}
