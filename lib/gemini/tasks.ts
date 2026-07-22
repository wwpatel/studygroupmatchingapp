import { Type, type Schema } from "@google/genai";
import { generateStructured } from "./generate";

// AI study-task suggestions for the Planner. Looks at upcoming tests, study
// plan progress, and weak topics, and proposes concrete, actionable to-dos.

export interface SuggestedTask {
  title: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null; // YYYY-MM-DD
}

const suggestSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description:
              "A concrete, actionable study task referencing a specific topic/activity, e.g. 'Review equilibrium flashcards — mastery is 45%'",
          },
          priority: { type: Type.STRING, format: "enum", enum: ["low", "medium", "high"] },
          dueDate: { type: Type.STRING, description: "Suggested due date YYYY-MM-DD, or empty if none" },
        },
        required: ["title", "priority", "dueDate"],
        propertyOrdering: ["title", "priority", "dueDate"],
      },
    },
  },
  required: ["tasks"],
};

export interface TaskContext {
  today: string;
  upcomingTests: { name: string; subject: string; date: string }[];
  weakTopics: { topic: string; subject: string; mastery: number }[];
  currentPlanNodes: { project: string; topic: string; activity: string; date: string | null }[];
}

export async function generateTaskSuggestions(ctx: TaskContext): Promise<SuggestedTask[]> {
  const system = `You are Nova, a study coach suggesting 3-5 specific, actionable study tasks for a high school student based on their real data. Prioritize tasks that address upcoming tests and weak topics. Reference concrete topics/activities and mastery percentages where given. Set higher priority for tasks tied to sooner tests or lower mastery. Return JSON matching the provided schema exactly, with dueDate as YYYY-MM-DD (before the relevant test) or empty string.`;

  const userPrompt = `Today: ${ctx.today}

Upcoming tests:
${ctx.upcomingTests.length ? ctx.upcomingTests.map((t) => `- ${t.name} (${t.subject}) on ${t.date}`).join("\n") : "(none)"}

Weak topics (mastery %):
${ctx.weakTopics.length ? ctx.weakTopics.map((w) => `- ${w.topic} (${w.subject}): ${Math.round(w.mastery)}%`).join("\n") : "(none tracked yet)"}

Current study-plan steps:
${ctx.currentPlanNodes.length ? ctx.currentPlanNodes.map((n) => `- ${n.project}: ${n.activity} on ${n.topic}${n.date ? ` (by ${n.date})` : ""}`).join("\n") : "(none)"}

Suggest the tasks now.`;

  const raw = await generateStructured<{ tasks: SuggestedTask[] }>(system, userPrompt, suggestSchema, 1536);
  return raw.tasks;
}
