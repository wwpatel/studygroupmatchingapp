import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { TopicBreakdown } from "@/lib/types/content";

type TypedClient = SupabaseClient<Database>;

const EMA_ALPHA = 0.35;

export async function getOrCreateTopic(
  supabase: TypedClient,
  subject: string,
  name: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("topics")
    .select("id")
    .eq("subject", subject)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("topics")
    .insert({ subject, name })
    .select("id")
    .single();

  if (error || !created) {
    const { data: retry } = await supabase
      .from("topics")
      .select("id")
      .eq("subject", subject)
      .eq("name", name)
      .single();
    if (retry) return retry.id;
    throw error ?? new Error(`Failed to create topic ${subject}/${name}`);
  }
  return created.id;
}

export async function updateSkillProfileFromAttempt(
  supabase: TypedClient,
  studentId: string,
  subject: string,
  topicBreakdown: TopicBreakdown[],
) {
  for (const tb of topicBreakdown) {
    if (tb.total === 0) continue;
    const performanceScore = (tb.correct / tb.total) * 100;
    const topicId = await getOrCreateTopic(supabase, subject, tb.topic);

    const { data: existing } = await supabase
      .from("skill_profile")
      .select("mastery_score, attempts_count")
      .eq("student_id", studentId)
      .eq("topic_id", topicId)
      .maybeSingle();

    if (existing) {
      const newScore = clamp(
        existing.mastery_score + EMA_ALPHA * (performanceScore - existing.mastery_score),
      );
      await supabase
        .from("skill_profile")
        .update({
          mastery_score: round2(newScore),
          attempts_count: existing.attempts_count + 1,
          last_updated: new Date().toISOString(),
        })
        .eq("student_id", studentId)
        .eq("topic_id", topicId);
    } else {
      const newScore = clamp(50 + EMA_ALPHA * 1.5 * (performanceScore - 50));
      await supabase.from("skill_profile").insert({
        student_id: studentId,
        topic_id: topicId,
        mastery_score: round2(newScore),
        attempts_count: 1,
      });
    }
  }
}

export async function applyCheckinAdjustment(
  supabase: TypedClient,
  studentId: string,
  topicId: string | null,
  confidenceBefore: number,
  confidenceAfter: number,
) {
  if (!topicId) return;
  const delta = confidenceAfter - confidenceBefore;
  if (delta === 0) return;

  const { data: existing } = await supabase
    .from("skill_profile")
    .select("mastery_score")
    .eq("student_id", studentId)
    .eq("topic_id", topicId)
    .maybeSingle();
  if (!existing) return;

  const adjustment = delta * 2; // confidence swing of +/-4 nudges mastery by up to +/-8
  const newScore = clamp(existing.mastery_score + adjustment);
  await supabase
    .from("skill_profile")
    .update({ mastery_score: round2(newScore), last_updated: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("topic_id", topicId);
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
