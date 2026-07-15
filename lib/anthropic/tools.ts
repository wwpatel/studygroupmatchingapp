import type Anthropic from "@anthropic-ai/sdk";

// Forced tool-use schemas. Every AI call whose output the UI renders directly
// goes through one of these instead of parsing freeform text.

export const quizTool: Anthropic.Tool = {
  name: "emit_quiz",
  description: "Emit a structured quiz or practice test matching the exact schema.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      topics: {
        type: "array",
        items: { type: "string" },
        description: "The distinct topics/subtopics this quiz covers",
      },
      questions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["mcq", "short_answer"] },
            topic: { type: "string", description: "The specific topic this question tests" },
            difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
            prompt: { type: "string" },
            options: {
              type: "array",
              items: { type: "string" },
              description: "Required for mcq only: exactly 4 answer options",
            },
            correctIndex: {
              type: "integer",
              description: "Required for mcq only: 0-based index of the correct option",
            },
            acceptableAnswers: {
              type: "array",
              items: { type: "string" },
              description: "Required for short_answer only: acceptable answer strings/synonyms",
            },
            explanation: {
              type: "string",
              description: "Brief explanation of the correct answer, shown after grading",
            },
          },
          required: ["kind", "topic", "difficulty", "prompt", "explanation"],
        },
      },
    },
    required: ["title", "topics", "questions"],
  },
};

export const flashcardTool: Anthropic.Tool = {
  name: "emit_flashcards",
  description: "Emit a structured flashcard set matching the exact schema.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      topics: { type: "array", items: { type: "string" } },
      cards: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            front: { type: "string", description: "Term or question" },
            back: { type: "string", description: "Definition or answer" },
          },
          required: ["topic", "front", "back"],
        },
      },
    },
    required: ["title", "topics", "cards"],
  },
};

export const gradeShortAnswersTool: Anthropic.Tool = {
  name: "emit_grades",
  description: "Emit grading results for a batch of short-answer responses.",
  input_schema: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            questionId: { type: "string" },
            isCorrect: { type: "boolean" },
            feedback: { type: "string", description: "One sentence of feedback" },
          },
          required: ["questionId", "isCorrect", "feedback"],
        },
      },
    },
    required: ["results"],
  },
};

export const matchReasoningTool: Anthropic.Tool = {
  name: "emit_match_reasoning",
  description: "Emit a structured explanation of why a study group was matched.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string", description: "One-sentence summary of the match" },
      reasoning: {
        type: "string",
        description: "2-4 sentence paragraph explaining the complementary strengths/weaknesses",
      },
      pairings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            strongStudentName: { type: "string" },
            growthStudentName: { type: "string" },
            note: { type: "string", description: "One short sentence on this pairing" },
          },
          required: ["topic", "strongStudentName", "growthStudentName", "note"],
        },
      },
    },
    required: ["headline", "reasoning", "pairings"],
  },
};

export const agendaTool: Anthropic.Tool = {
  name: "emit_agenda",
  description: "Emit a structured study session agenda.",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "One-sentence summary of the session goal" },
      totalMinutes: { type: "integer" },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            topic: { type: "string" },
            focus: { type: "string", description: "What the group should do for this topic" },
            leadStudentName: {
              type: ["string", "null"],
              description: "Name of the student best positioned to help with this topic, or null",
            },
            durationMinutes: { type: "integer" },
          },
          required: ["topic", "focus", "leadStudentName", "durationMinutes"],
        },
      },
    },
    required: ["summary", "totalMinutes", "items"],
  },
};
