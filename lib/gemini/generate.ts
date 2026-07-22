import { Type, type Schema } from "@google/genai";
import { getGeminiClient, GENERATION_MODEL } from "./client";
import type {
  QuizContent,
  FlashcardContent,
  QuizQuestion,
  Flashcard,
  MatchedStudentSummary,
  GroupAgenda,
  MatchReasoning,
} from "@/lib/types/content";

// Structured content generation on the Gemini API. Every call that produces
// JSON the UI renders directly uses Gemini's controlled generation
// (responseMimeType "application/json" + a responseSchema) instead of parsing
// freeform text — the equivalent of forced tool-use on other providers.

export class AIGenerationError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AIGenerationError";
  }
}

export async function generateStructured<T>(
  system: string,
  userPrompt: string,
  schema: Schema,
  maxOutputTokens = 8192,
): Promise<T> {
  let ai: ReturnType<typeof getGeminiClient>;
  try {
    ai = getGeminiClient();
  } catch (err) {
    // Almost always a missing/empty GEMINI_API_KEY. Surface the real reason
    // instead of a generic "request failed" so it's obvious what to fix.
    console.error("[gemini] client initialization failed:", err);
    throw new AIGenerationError(
      err instanceof Error ? err.message : "Gemini client is not configured",
      err,
    );
  }

  let text: string;
  try {
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens,
      },
    });
    text = response.text ?? "";
  } catch (err) {
    // Log the underlying error in full for debugging, and pass a specific,
    // actionable message up to the route rather than an opaque failure.
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      `[gemini] generateContent failed (model ${GENERATION_MODEL}):`,
      err,
    );
    throw new AIGenerationError(`Gemini API request failed — ${detail}`, err);
  }

  if (!text.trim()) {
    // Empty output usually means the response was cut off or safety-blocked.
    throw new AIGenerationError(
      "Gemini returned an empty response (possibly blocked or truncated)",
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch (err) {
    console.error(
      "[gemini] failed to parse structured JSON. Raw output (truncated):",
      text.slice(0, 500),
    );
    throw new AIGenerationError("Gemini did not return valid structured JSON", err);
  }
}

function withIds<T extends object>(item: T): T & { id: string } {
  return { ...item, id: crypto.randomUUID() };
}

// ─── Schemas ──────────────────────────────────────────────────────────────

const quizSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    topics: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "The distinct topics/subtopics this quiz covers",
    },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          kind: {
            type: Type.STRING,
            format: "enum",
            enum: ["mcq", "short_answer"],
          },
          topic: {
            type: Type.STRING,
            description: "The specific topic this question tests",
          },
          difficulty: {
            type: Type.STRING,
            format: "enum",
            enum: ["easy", "medium", "hard"],
          },
          prompt: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "For mcq only: exactly 4 answer options. Omit entirely for short_answer questions.",
          },
          correctIndex: {
            type: Type.INTEGER,
            description:
              "For mcq only: 0-based index (0-3) of the correct option. Omit entirely for short_answer questions.",
          },
          acceptableAnswers: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "For short_answer only: acceptable answer strings/synonyms. Omit entirely for mcq questions.",
          },
          explanation: {
            type: Type.STRING,
            description: "Brief explanation of the correct answer, shown after grading",
          },
        },
        required: ["kind", "topic", "difficulty", "prompt", "explanation"],
        propertyOrdering: [
          "kind",
          "topic",
          "difficulty",
          "prompt",
          "options",
          "correctIndex",
          "acceptableAnswers",
          "explanation",
        ],
      },
    },
  },
  required: ["title", "topics", "questions"],
  propertyOrdering: ["title", "topics", "questions"],
};

const flashcardSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    topics: { type: Type.ARRAY, items: { type: Type.STRING } },
    cards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          front: { type: Type.STRING, description: "Term or question" },
          back: { type: Type.STRING, description: "Definition or answer" },
        },
        required: ["topic", "front", "back"],
        propertyOrdering: ["topic", "front", "back"],
      },
    },
  },
  required: ["title", "topics", "cards"],
  propertyOrdering: ["title", "topics", "cards"],
};

const gradesSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          questionId: { type: Type.STRING },
          isCorrect: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING, description: "One sentence of feedback" },
        },
        required: ["questionId", "isCorrect", "feedback"],
        propertyOrdering: ["questionId", "isCorrect", "feedback"],
      },
    },
  },
  required: ["results"],
};

const matchReasoningSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING, description: "One-sentence summary of the match" },
    reasoning: {
      type: Type.STRING,
      description:
        "2-4 sentence paragraph explaining the complementary strengths/weaknesses",
    },
    pairings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          strongStudentName: { type: Type.STRING },
          growthStudentName: { type: Type.STRING },
          note: { type: Type.STRING, description: "One short sentence on this pairing" },
        },
        required: ["topic", "strongStudentName", "growthStudentName", "note"],
        propertyOrdering: ["topic", "strongStudentName", "growthStudentName", "note"],
      },
    },
  },
  required: ["headline", "reasoning", "pairings"],
  propertyOrdering: ["headline", "reasoning", "pairings"],
};

const agendaSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "One-sentence summary of the session goal" },
    totalMinutes: { type: Type.INTEGER },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          focus: { type: Type.STRING, description: "What the group should do for this topic" },
          leadStudentName: {
            type: Type.STRING,
            nullable: true,
            description:
              "Name of the student best positioned to help with this topic, or null",
          },
          durationMinutes: { type: Type.INTEGER },
        },
        required: ["topic", "focus", "leadStudentName", "durationMinutes"],
        propertyOrdering: ["topic", "focus", "leadStudentName", "durationMinutes"],
      },
    },
  },
  required: ["summary", "totalMinutes", "items"],
  propertyOrdering: ["summary", "totalMinutes", "items"],
};

// ─── Generators ─────────────────────────────────────────────────────────────

export async function generateQuizOrTest(params: {
  materialContent: string;
  subject: string;
  kind: "quiz" | "test";
}): Promise<QuizContent> {
  const { materialContent, subject, kind } = params;
  const isTest = kind === "test";

  const system = `You are Nova, an expert curriculum designer creating study materials for a high school ${subject} student. Generate content strictly grounded in the provided source material — do not invent facts outside it. Return JSON matching the provided schema exactly. For each multiple-choice question set "kind" to "mcq" and provide exactly 4 "options" plus a "correctIndex"; for each open-ended question set "kind" to "short_answer" and provide "acceptableAnswers". Never mix those fields across kinds.`;

  const userPrompt = isTest
    ? `Create a full-length practice test from this material. Include 10-14 questions, a mix of multiple-choice and short-answer, mixed difficulty (easy/medium/hard), covering all major topics in the material.\n\nSource material:\n${materialContent}`
    : `Create a shorter quiz from this material. Include 6-8 questions, a mix of multiple-choice and short-answer, mostly easy/medium difficulty, covering the key topics in the material.\n\nSource material:\n${materialContent}`;

  const raw = await generateStructured<{
    title: string;
    topics: string[];
    questions: Array<Omit<QuizQuestion, "id">>;
  }>(system, userPrompt, quizSchema, isTest ? 12000 : 8192);

  return {
    kind,
    subject,
    title: raw.title,
    topics: raw.topics,
    questions: raw.questions.map((q) => withIds(q)) as QuizQuestion[],
  };
}

export async function generateDiagnosticQuiz(subject: string): Promise<QuizContent> {
  const system = `You are Nova, an expert ${subject} teacher building a short diagnostic quiz for a high school student. The quiz should sample foundational and intermediate topics across the subject so we can measure baseline mastery per topic. Return JSON matching the provided schema exactly — every question should have "kind" set to "mcq" with exactly 4 "options" and a "correctIndex".`;
  const userPrompt = `Create a diagnostic quiz for ${subject} with 8 multiple-choice questions spanning 4-6 distinct core topics in this subject (2 questions per topic), mixed difficulty.`;

  const raw = await generateStructured<{
    title: string;
    topics: string[];
    questions: Array<Omit<QuizQuestion, "id">>;
  }>(system, userPrompt, quizSchema, 8192);

  return {
    kind: "quiz",
    subject,
    title: raw.title,
    topics: raw.topics,
    questions: raw.questions.map((q) => withIds(q)) as QuizQuestion[],
  };
}

// Chat-requested quiz with no matching uploaded material — generated from
// general knowledge on the named topic rather than grounded in source text.
// Same schema/pipeline as generateQuizOrTest, just a different prompt.
export async function generateTopicQuiz(params: {
  topic: string;
  subject: string;
  kind: "quiz" | "test";
}): Promise<QuizContent> {
  const { topic, subject, kind } = params;
  const isTest = kind === "test";

  const system = `You are Nova, an expert ${subject} teacher building a ${isTest ? "practice test" : "practice quiz"} for a high school student, from your own subject-matter knowledge (no source material was provided). Return JSON matching the provided schema exactly. For each multiple-choice question set "kind" to "mcq" and provide exactly 4 "options" plus a "correctIndex"; for each open-ended question set "kind" to "short_answer" and provide "acceptableAnswers". Never mix those fields across kinds.`;

  const userPrompt = isTest
    ? `Create a full-length practice test on "${topic}" (subject: ${subject}). Include 10-14 questions, a mix of multiple-choice and short-answer, mixed difficulty (easy/medium/hard), covering the key sub-topics of "${topic}".`
    : `Create a shorter practice quiz on "${topic}" (subject: ${subject}). Include 6-8 questions, a mix of multiple-choice and short-answer, mostly easy/medium difficulty, covering the key sub-topics of "${topic}".`;

  const raw = await generateStructured<{
    title: string;
    topics: string[];
    questions: Array<Omit<QuizQuestion, "id">>;
  }>(system, userPrompt, quizSchema, isTest ? 12000 : 8192);

  return {
    kind,
    subject,
    title: raw.title,
    topics: raw.topics,
    questions: raw.questions.map((q) => withIds(q)) as QuizQuestion[],
  };
}

export async function generateFlashcards(params: {
  materialContent: string;
  subject: string;
}): Promise<FlashcardContent> {
  const { materialContent, subject } = params;
  const system = `You are Nova, an expert curriculum designer creating flashcards for a high school ${subject} student. Ground every card in the provided source material. Return JSON matching the provided schema exactly.`;
  const userPrompt = `Create a flashcard set from this material. Include 10-16 term/definition or Q&A style cards covering the key concepts.\n\nSource material:\n${materialContent}`;

  const raw = await generateStructured<{
    title: string;
    topics: string[];
    cards: Array<Omit<Flashcard, "id">>;
  }>(system, userPrompt, flashcardSchema, 8192);

  return {
    kind: "flashcards",
    subject,
    title: raw.title,
    topics: raw.topics,
    cards: raw.cards.map((c) => withIds(c)) as Flashcard[],
  };
}

// Chat-requested flashcards with no matching uploaded material — generated
// from general knowledge on the named topic (mirrors generateTopicQuiz).
export async function generateTopicFlashcards(params: {
  topic: string;
  subject: string;
}): Promise<FlashcardContent> {
  const { topic, subject } = params;
  const system = `You are Nova, an expert ${subject} teacher creating flashcards for a high school student, from your own subject-matter knowledge (no source material was provided). Return JSON matching the provided schema exactly.`;
  const userPrompt = `Create a flashcard set on "${topic}" (subject: ${subject}). Include 10-16 term/definition or Q&A style cards covering the key concepts of "${topic}".`;

  const raw = await generateStructured<{
    title: string;
    topics: string[];
    cards: Array<Omit<Flashcard, "id">>;
  }>(system, userPrompt, flashcardSchema, 8192);

  return {
    kind: "flashcards",
    subject,
    title: raw.title,
    topics: raw.topics,
    cards: raw.cards.map((c) => withIds(c)) as Flashcard[],
  };
}

export async function gradeShortAnswers(
  items: {
    questionId: string;
    prompt: string;
    studentAnswer: string;
    acceptableAnswers: string[];
  }[],
): Promise<Map<string, { isCorrect: boolean; feedback: string }>> {
  if (items.length === 0) return new Map();

  const system =
    "You are grading short-answer responses on a high school quiz. Be lenient about phrasing, capitalization, and minor typos, but strict about factual correctness. Return JSON matching the provided schema exactly, with one result per question (echo back the given id).";
  const userPrompt = items
    .map(
      (it, i) =>
        `Q${i + 1} (id: ${it.questionId})\nQuestion: ${it.prompt}\nAcceptable answers: ${it.acceptableAnswers.join(", ")}\nStudent answer: ${it.studentAnswer}`,
    )
    .join("\n\n");

  const raw = await generateStructured<{
    results: { questionId: string; isCorrect: boolean; feedback: string }[];
  }>(system, userPrompt, gradesSchema, 4096);

  return new Map(raw.results.map((r) => [r.questionId, r]));
}

export async function generateMatchReasoning(
  students: MatchedStudentSummary[],
  subject: string,
): Promise<MatchReasoning> {
  const system = `You are Nova, explaining why a study group of high school ${subject} students was matched. Reference their actual topic strengths and growth areas by name. Be specific and encouraging. Return JSON matching the provided schema exactly.`;
  const userPrompt = `Group members and their skill profiles:\n${JSON.stringify(students, null, 2)}\n\nExplain why this group is a good complementary match, and identify 2-3 specific pairings where one student's strength covers another's growth area.`;

  return generateStructured<MatchReasoning>(system, userPrompt, matchReasoningSchema, 2048);
}

export async function generateSessionAgenda(
  students: MatchedStudentSummary[],
  subject: string,
): Promise<GroupAgenda> {
  const system = `You are Nova, building a focused 45-60 minute study session agenda for a group of high school ${subject} students. Assign topics to whichever student is strongest in them as the informal lead. Return JSON matching the provided schema exactly.`;
  const userPrompt = `Group members and their skill profiles:\n${JSON.stringify(students, null, 2)}\n\nBuild a session agenda with 3-5 agenda items covering the group's shared growth areas, each with a suggested lead student and duration. Total time should be 45-60 minutes.`;

  return generateStructured<GroupAgenda>(system, userPrompt, agendaSchema, 2048);
}
