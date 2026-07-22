import { Type, type Schema } from "@google/genai";
import { generateStructured } from "./generate";

// AI study-plan generation for a Project. Produces an ordered sequence of study
// blocks ("nodes"), each with a topic, an activity type, a one-line
// description, and a scheduled date leading up to the test. Rendered as a
// Duolingo-style path.

export type NodeActivity = "quiz" | "flashcards" | "game" | "chat" | "review";

export interface StudyPlanNode {
  topic: string;
  activityType: NodeActivity;
  description: string;
  scheduledDate: string | null; // YYYY-MM-DD
}

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING, description: "The specific topic for this study block" },
          activityType: {
            type: Type.STRING,
            format: "enum",
            enum: ["quiz", "flashcards", "game", "chat", "review"],
            description: "The suggested activity for this block",
          },
          description: {
            type: Type.STRING,
            description: "One short sentence describing what to do in this block",
          },
          scheduledDate: {
            type: Type.STRING,
            description: "Date to do this block, YYYY-MM-DD, spread evenly before the test date",
          },
        },
        required: ["topic", "activityType", "description", "scheduledDate"],
        propertyOrdering: ["topic", "activityType", "description", "scheduledDate"],
      },
    },
  },
  required: ["nodes"],
};

export async function generateStudyPlan(params: {
  name: string;
  subject: string;
  topics: string[];
  testDate: string | null; // earliest upcoming test, YYYY-MM-DD
  today: string; // YYYY-MM-DD
}): Promise<StudyPlanNode[]> {
  const { name, subject, topics, testDate, today } = params;

  const windowText = testDate
    ? `Today is ${today}. The test is on ${testDate}. Spread the blocks evenly across the days between today and the test, scheduling earlier topics first and leaving the final 1-2 days for review.`
    : `Today is ${today}. There's no fixed test date yet — schedule roughly one block every 1-2 days starting from today.`;

  const topicText =
    topics.length > 0
      ? `Focus on these topics: ${topics.join(", ")}.`
      : `Infer 6-10 core topics for this class yourself.`;

  const system = `You are Nova, building a personalized study plan for a high school student's "${name}" (${subject}) class. Produce an ordered sequence of 6-12 study blocks that build toward mastery. ${topicText} Vary the activity types across blocks (quiz, flashcards, game, chat, review) so studying stays engaging — early blocks lean on flashcards/chat to learn, later blocks on quiz/game/review to test. ${windowText} Return JSON matching the provided schema exactly, with scheduledDate as YYYY-MM-DD.`;

  const userPrompt = `Class: ${name}\nSubject: ${subject}\nBuild the study plan now.`;

  const raw = await generateStructured<{ nodes: StudyPlanNode[] }>(
    system,
    userPrompt,
    planSchema,
    3072,
  );
  return raw.nodes;
}
