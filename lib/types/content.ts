// Structured shapes for AI-generated JSON that the UI renders directly.
// Every Claude call that produces one of these must request this exact shape.

export type Difficulty = "easy" | "medium" | "hard";

export interface MCQQuestion {
  id: string;
  kind: "mcq";
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ShortAnswerQuestion {
  id: string;
  kind: "short_answer";
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  acceptableAnswers: string[];
  explanation: string;
}

export type QuizQuestion = MCQQuestion | ShortAnswerQuestion;

export interface QuizContent {
  kind: "quiz" | "test";
  subject: string;
  title: string;
  topics: string[];
  questions: QuizQuestion[];
}

export interface Flashcard {
  id: string;
  topic: string;
  front: string;
  back: string;
}

export interface FlashcardContent {
  kind: "flashcards";
  subject: string;
  title: string;
  topics: string[];
  cards: Flashcard[];
}

export type GeneratedContentBody = QuizContent | FlashcardContent;

// Per-question grading result, stored in attempts.answers
export interface AnswerRecord {
  questionId: string;
  topic: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  pointsPossible: number;
}

export interface TopicBreakdown {
  topic: string;
  correct: number;
  total: number;
}

// Group matching
export interface MatchedStudentSummary {
  studentId: string;
  name: string;
  strengths: { topic: string; masteryScore: number }[];
  growthAreas: { topic: string; masteryScore: number }[];
}

export interface GroupAgendaItem {
  topic: string;
  focus: string;
  leadStudentId: string | null;
  leadStudentName: string | null;
  durationMinutes: number;
}

export interface GroupAgenda {
  summary: string;
  totalMinutes: number;
  items: GroupAgendaItem[];
}

export interface MatchPairing {
  topic: string;
  strongStudentName: string;
  growthStudentName: string;
  note: string;
}

export interface MatchReasoning {
  headline: string;
  reasoning: string;
  pairings: MatchPairing[];
}

export interface ChatDiagnosticState {
  awaitingDiagnosticAnswer: boolean;
  topic?: string;
}
