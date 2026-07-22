import { Type, type Schema } from "@google/genai";
import { generateStructured } from "./generate";

// AI mini-lesson generation. Produces a short, narrated slideshow script from a
// course material: 3-8 segments, each one concept, with narration text (spoken
// via the browser's SpeechSynthesis), key terms to highlight, and a short
// visual hint rendered as a styled card. NOT a video file.

export interface LessonSegment {
  title: string;
  script: string; // ~30-90s of narration
  keyTerms: string[];
  visualHint: string; // one short phrase describing the on-screen visual
}

export interface MiniLesson {
  title: string;
  segments: LessonSegment[];
}

const lessonSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short lesson title" },
    segments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "The concept this segment teaches" },
          script: {
            type: Type.STRING,
            description:
              "What the narrator says — 2-4 sentences (~30-90 seconds spoken), clear and conversational, teaching this one concept.",
          },
          keyTerms: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2-4 key terms from this segment to highlight on screen",
          },
          visualHint: {
            type: Type.STRING,
            description: "One short phrase describing a simple visual for this concept (e.g. 'a labeled cell diagram')",
          },
        },
        required: ["title", "script", "keyTerms", "visualHint"],
        propertyOrdering: ["title", "script", "keyTerms", "visualHint"],
      },
    },
  },
  required: ["title", "segments"],
};

export async function generateMiniLesson(params: {
  materialContent: string;
  subject: string;
  materialTitle: string;
}): Promise<MiniLesson> {
  const { materialContent, subject, materialTitle } = params;

  const system = `You are Nova, teaching a high school ${subject} student by turning their material into a short narrated mini-lesson. Produce 3-8 segments, each teaching ONE concept in 2-4 conversational sentences (about 30-90 seconds of narration). Ground everything strictly in the provided material. Order segments so concepts build on each other. Return JSON matching the provided schema exactly.`;

  const userPrompt = `Material: "${materialTitle}" (${subject})\n---\n${materialContent.slice(0, 12000)}\n---\nBuild the mini-lesson now.`;

  return generateStructured<MiniLesson>(system, userPrompt, lessonSchema, 4096);
}
