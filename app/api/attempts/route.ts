import { createClient } from "@/lib/supabase/server";
import { gradeShortAnswers, AIGenerationError } from "@/lib/gemini/generate";
import { updateSkillProfileFromAttempt } from "@/lib/skill";
import { recordEngagement, type UnlockedBadge } from "@/lib/gamification/engine";
import type { QuizContent, AnswerRecord, TopicBreakdown } from "@/lib/types/content";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const generatedContentId = body?.generatedContentId as string | undefined;
  const submittedAnswers = body?.answers as { questionId: string; studentAnswer: string }[] | undefined;

  if (!generatedContentId || !submittedAnswers) {
    return NextResponse.json({ error: "generatedContentId and answers are required" }, { status: 400 });
  }

  const { data: generated, error: fetchError } = await supabase
    .from("generated_content")
    .select("id, content, student_id")
    .eq("id", generatedContentId)
    .single();

  if (fetchError || !generated || generated.student_id !== user.id) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const content = generated.content as unknown as QuizContent;
  const answerByQuestionId = new Map(submittedAnswers.map((a) => [a.questionId, a.studentAnswer]));

  const shortAnswerQuestions = content.questions.filter((q) => q.kind === "short_answer");
  let shortAnswerGrades: Map<string, { isCorrect: boolean; feedback: string }>;
  try {
    shortAnswerGrades = await gradeShortAnswers(
      shortAnswerQuestions.map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        studentAnswer: answerByQuestionId.get(q.id) ?? "",
        acceptableAnswers: q.acceptableAnswers,
      })),
    );
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }

  const records: AnswerRecord[] = content.questions.map((q) => {
    const studentAnswer = answerByQuestionId.get(q.id) ?? "";
    if (q.kind === "mcq") {
      const isCorrect = studentAnswer === String(q.correctIndex);
      return {
        questionId: q.id,
        topic: q.topic,
        studentAnswer: studentAnswer === "" ? "" : q.options[Number(studentAnswer)] ?? "",
        correctAnswer: q.options[q.correctIndex],
        isCorrect,
        pointsAwarded: isCorrect ? 1 : 0,
        pointsPossible: 1,
      };
    }
    const grade = shortAnswerGrades.get(q.id);
    const isCorrect = grade?.isCorrect ?? false;
    return {
      questionId: q.id,
      topic: q.topic,
      studentAnswer,
      correctAnswer: q.acceptableAnswers[0] ?? "",
      isCorrect,
      pointsAwarded: isCorrect ? 1 : 0,
      pointsPossible: 1,
    };
  });

  const score = records.reduce((s, r) => s + r.pointsAwarded, 0);
  const maxScore = records.reduce((s, r) => s + r.pointsPossible, 0);

  const topicMap = new Map<string, { correct: number; total: number }>();
  for (const r of records) {
    const t = topicMap.get(r.topic) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (r.isCorrect) t.correct += 1;
    topicMap.set(r.topic, t);
  }
  const topicBreakdown: TopicBreakdown[] = Array.from(topicMap.entries()).map(([topic, v]) => ({
    topic,
    ...v,
  }));

  const { data: attempt, error: insertError } = await supabase
    .from("attempts")
    .insert({
      student_id: user.id,
      generated_content_id: generatedContentId,
      subject: content.subject,
      score,
      max_score: maxScore,
      topic_breakdown: topicBreakdown as unknown as import("@/lib/types/database").Json,
      answers: records as unknown as import("@/lib/types/database").Json,
    })
    .select("id")
    .single();

  if (insertError || !attempt) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to save attempt" }, { status: 500 });
  }

  let masteryBadges: UnlockedBadge[] = [];
  try {
    masteryBadges = await updateSkillProfileFromAttempt(
      supabase,
      user.id,
      content.subject,
      topicBreakdown,
    );
  } catch {
    // Attempt is saved even if the skill-profile update has a transient failure.
  }

  // Gamification: XP + streak + activity/streak badges. Never blocks the
  // attempt result.
  const engagement = await recordEngagement(
    supabase,
    user.id,
    content.kind === "test" ? "test_completed" : "quiz_completed",
    attempt.id,
  );

  return NextResponse.json({
    attemptId: attempt.id,
    xpAwarded: engagement.xpAwarded,
    streak: engagement.streak,
    newBadges: [...engagement.newBadges, ...masteryBadges],
  });
}
