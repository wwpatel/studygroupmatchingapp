import { getAnthropicClient, MODEL } from "./client";
import {
  quizTool,
  flashcardTool,
  gradeShortAnswersTool,
  matchReasoningTool,
  agendaTool,
} from "./tools";
import type {
  QuizContent,
  FlashcardContent,
  QuizQuestion,
  Flashcard,
  MatchedStudentSummary,
  GroupAgenda,
  MatchReasoning,
} from "@/lib/types/content";
import Anthropic from "@anthropic-ai/sdk";

export class AIGenerationError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "AIGenerationError";
  }
}

async function callTool<T>(
  system: string,
  userPrompt: string,
  tool: Anthropic.Tool,
  maxTokens = 8192,
): Promise<T> {
  let response: Anthropic.Message;
  try {
    const anthropic = getAnthropicClient();
    response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    throw new AIGenerationError("Claude API request failed", err);
  }

  if (response.stop_reason === "refusal") {
    throw new AIGenerationError("Claude declined to generate this content");
  }

  const block = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!block) {
    throw new AIGenerationError("Claude did not return structured output");
  }
  return block.input as T;
}

function withIds<T extends object>(item: T): T & { id: string } {
  return { ...item, id: crypto.randomUUID() };
}

export async function generateQuizOrTest(params: {
  materialContent: string;
  subject: string;
  kind: "quiz" | "test";
}): Promise<QuizContent> {
  const { materialContent, subject, kind } = params;
  const isTest = kind === "test";

  const system = `You are Nova, an expert curriculum designer creating study materials for a high school ${subject} student. Generate content strictly grounded in the provided source material — do not invent facts outside it. Use the emit_quiz tool to return your output.`;

  const userPrompt = isTest
    ? `Create a full-length practice test from this material. Include 10-14 questions, a mix of multiple-choice and short-answer, mixed difficulty (easy/medium/hard), covering all major topics in the material.\n\nSource material:\n${materialContent}`
    : `Create a shorter quiz from this material. Include 6-8 questions, a mix of multiple-choice and short-answer, mostly easy/medium difficulty, covering the key topics in the material.\n\nSource material:\n${materialContent}`;

  const raw = await callTool<{
    title: string;
    topics: string[];
    questions: Array<Omit<QuizQuestion, "id">>;
  }>(system, userPrompt, quizTool, isTest ? 12000 : 8192);

  return {
    kind,
    subject,
    title: raw.title,
    topics: raw.topics,
    questions: raw.questions.map((q) => withIds(q)) as QuizQuestion[],
  };
}

export async function generateDiagnosticQuiz(subject: string): Promise<QuizContent> {
  const system = `You are Nova, an expert ${subject} teacher building a short diagnostic quiz for a high school student. The quiz should sample foundational and intermediate topics across the subject so we can measure baseline mastery per topic. Use the emit_quiz tool to return your output.`;
  const userPrompt = `Create a diagnostic quiz for ${subject} with 8 multiple-choice questions spanning 4-6 distinct core topics in this subject (2 questions per topic), mixed difficulty.`;

  const raw = await callTool<{
    title: string;
    topics: string[];
    questions: Array<Omit<QuizQuestion, "id">>;
  }>(system, userPrompt, quizTool, 8192);

  return {
    kind: "quiz",
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
  const system = `You are Nova, an expert curriculum designer creating flashcards for a high school ${subject} student. Ground every card in the provided source material. Use the emit_flashcards tool to return your output.`;
  const userPrompt = `Create a flashcard set from this material. Include 10-16 term/definition or Q&A style cards covering the key concepts.\n\nSource material:\n${materialContent}`;

  const raw = await callTool<{
    title: string;
    topics: string[];
    cards: Array<Omit<Flashcard, "id">>;
  }>(system, userPrompt, flashcardTool, 8192);

  return {
    kind: "flashcards",
    subject,
    title: raw.title,
    topics: raw.topics,
    cards: raw.cards.map((c) => withIds(c)) as Flashcard[],
  };
}

export async function gradeShortAnswers(
  items: { questionId: string; prompt: string; studentAnswer: string; acceptableAnswers: string[] }[],
): Promise<Map<string, { isCorrect: boolean; feedback: string }>> {
  if (items.length === 0) return new Map();

  const system =
    "You are grading short-answer responses on a high school quiz. Be lenient about phrasing, capitalization, and minor typos, but strict about factual correctness. Use the emit_grades tool to return your output.";
  const userPrompt = items
    .map(
      (it, i) =>
        `Q${i + 1} (id: ${it.questionId})\nQuestion: ${it.prompt}\nAcceptable answers: ${it.acceptableAnswers.join(", ")}\nStudent answer: ${it.studentAnswer}`,
    )
    .join("\n\n");

  const raw = await callTool<{
    results: { questionId: string; isCorrect: boolean; feedback: string }[];
  }>(system, userPrompt, gradeShortAnswersTool, 4096);

  return new Map(raw.results.map((r) => [r.questionId, r]));
}

export async function generateMatchReasoning(
  students: MatchedStudentSummary[],
  subject: string,
): Promise<MatchReasoning> {
  const system = `You are Nova, explaining why a study group of high school ${subject} students was matched. Reference their actual topic strengths and growth areas by name. Be specific and encouraging. Use the emit_match_reasoning tool to return your output.`;
  const userPrompt = `Group members and their skill profiles:\n${JSON.stringify(students, null, 2)}\n\nExplain why this group is a good complementary match, and identify 2-3 specific pairings where one student's strength covers another's growth area.`;

  return callTool<MatchReasoning>(system, userPrompt, matchReasoningTool, 2048);
}

export async function generateSessionAgenda(
  students: MatchedStudentSummary[],
  subject: string,
): Promise<GroupAgenda> {
  const system = `You are Nova, building a focused 45-60 minute study session agenda for a group of high school ${subject} students. Assign topics to whichever student is strongest in them as the informal lead. Use the emit_agenda tool to return your output.`;
  const userPrompt = `Group members and their skill profiles:\n${JSON.stringify(students, null, 2)}\n\nBuild a session agenda with 3-5 agenda items covering the group's shared growth areas, each with a suggested lead student and duration. Total time should be 45-60 minutes.`;

  return callTool<GroupAgenda>(system, userPrompt, agendaTool, 2048);
}
