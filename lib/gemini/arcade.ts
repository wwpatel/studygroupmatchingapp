import { Type, type Schema } from "@google/genai";
import { generateStructured } from "./generate";
import type {
  GameType,
  ArcadeContent,
  MatchUpContent,
  TermBlasterContent,
  SortItContent,
  FillGapContent,
} from "@/lib/types/arcade";

// Structured generation of Arcade game content. Each game type has its own
// schema; all run through the same generateStructured pipeline used by
// quizzes/flashcards, so quality/format stay consistent and Gemini is the only
// model involved.

const matchUpSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    pairs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: "A short term or concept (1-4 words)" },
          definition: { type: Type.STRING, description: "A concise definition (max ~12 words)" },
        },
        required: ["term", "definition"],
        propertyOrdering: ["term", "definition"],
      },
    },
  },
  required: ["pairs"],
};

const termBlasterSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING, description: "A short question (fits one line)" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 short answer options (1-3 words each)",
          },
          correctIndex: { type: Type.INTEGER, description: "0-based index (0-3) of the correct option" },
        },
        required: ["question", "options", "correctIndex"],
        propertyOrdering: ["question", "options", "correctIndex"],
      },
    },
  },
  required: ["questions"],
};

const sortItSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    categories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-4 distinct category names",
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: "A short term to be sorted (1-3 words)" },
          category: { type: Type.STRING, description: "Exactly one of the category names" },
        },
        required: ["term", "category"],
        propertyOrdering: ["term", "category"],
      },
    },
  },
  required: ["categories", "items"],
};

const fillGapSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sentence: {
            type: Type.STRING,
            description: 'A factual sentence with the key term replaced by exactly "____" (four underscores)',
          },
          answer: { type: Type.STRING, description: "The word/phrase that fills the blank" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 options including the correct answer, plausible distractors",
          },
        },
        required: ["sentence", "answer", "options"],
        propertyOrdering: ["sentence", "answer", "options"],
      },
    },
  },
  required: ["items"],
};

const GAME_SCHEMAS: Record<GameType, Schema> = {
  match_up: matchUpSchema,
  term_blaster: termBlasterSchema,
  sort_it: sortItSchema,
  fill_gap: fillGapSchema,
};

const GAME_INSTRUCTIONS: Record<GameType, string> = {
  match_up:
    "Produce 6 term/definition pairs covering the most important concepts. Keep terms short and definitions concise so they fit on small cards.",
  term_blaster:
    "Produce 8 quick multiple-choice questions, each with exactly 4 short options and the correct index. Options must be short (1-3 words) so they read while floating.",
  sort_it:
    "Produce exactly 3 categories and 12 items (4 per category), each item assigned to exactly one of the categories by name. Categories must be clearly distinguishable.",
  fill_gap:
    'Produce 8 fill-in-the-blank items. Each sentence must contain exactly one blank written as "____" (four underscores), an answer, and 4 options including that answer.',
};

export async function generateArcadeContent(params: {
  gameType: GameType;
  subject: string;
  topic: string;
  materialContent?: string | null;
}): Promise<ArcadeContent> {
  const { gameType, subject, topic, materialContent } = params;

  const source = materialContent
    ? `Ground everything strictly in this source material:\n---\n${materialContent.slice(0, 12000)}\n---`
    : `Generate from your own knowledge of the topic "${topic}".`;

  const system = `You are Nova, designing content for a study mini-game ("${gameType}") for a high school ${subject} student. ${GAME_INSTRUCTIONS[gameType]} Return JSON matching the provided schema exactly. Keep all text concise and game-friendly.`;

  const userPrompt = `Topic: ${topic} (subject: ${subject}).\n${source}`;

  return generateStructured<ArcadeContent>(system, userPrompt, GAME_SCHEMAS[gameType], 4096);
}

// Runtime shape guards so a malformed generation can't crash a game renderer.
export function isValidArcadeContent(gameType: GameType, content: unknown): boolean {
  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;
  switch (gameType) {
    case "match_up":
      return Array.isArray((c as unknown as MatchUpContent).pairs) &&
        (c as unknown as MatchUpContent).pairs.length >= 2;
    case "term_blaster":
      return Array.isArray((c as unknown as TermBlasterContent).questions) &&
        (c as unknown as TermBlasterContent).questions.length >= 1;
    case "sort_it": {
      const s = c as unknown as SortItContent;
      return Array.isArray(s.categories) && s.categories.length >= 2 &&
        Array.isArray(s.items) && s.items.length >= 2;
    }
    case "fill_gap":
      return Array.isArray((c as unknown as FillGapContent).items) &&
        (c as unknown as FillGapContent).items.length >= 1;
    default:
      return false;
  }
}
