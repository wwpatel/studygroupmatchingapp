import { createClient } from "@/lib/supabase/server";
import { generateTaskSuggestions } from "@/lib/gemini/tasks";
import { AIGenerationError } from "@/lib/gemini/generate";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const today = todayKey();

  // Gather the real context: projects (test dates), weak topics, current plan nodes.
  const [{ data: projects }, { data: skillRows }] = await Promise.all([
    supabase.from("projects").select("id, name, subject, test_dates").eq("student_id", user.id),
    supabase
      .from("skill_profile")
      .select("mastery_score, topics!inner(name, subject)")
      .eq("student_id", user.id)
      .order("mastery_score", { ascending: true })
      .limit(6),
  ]);

  const upcomingTests = (projects ?? []).flatMap((p) =>
    ((p.test_dates as string[]) ?? [])
      .filter((d) => d && d >= today)
      .map((date) => ({ name: p.name, subject: p.subject, date })),
  );

  const weakTopics = (skillRows as unknown as
    | { mastery_score: number; topics: { name: string; subject: string } | null }[]
    | null ?? [])
    .filter((r) => r.topics && r.mastery_score < 70)
    .map((r) => ({ topic: r.topics!.name, subject: r.topics!.subject, mastery: r.mastery_score }));

  // Current plan nodes across projects.
  const projectIds = (projects ?? []).map((p) => p.id);
  const nameById = new Map((projects ?? []).map((p) => [p.id, p.name]));
  let currentPlanNodes: { project: string; topic: string; activity: string; date: string | null }[] = [];
  if (projectIds.length > 0) {
    const { data: nodes } = await supabase
      .from("study_plan_nodes")
      .select("project_id, topic, activity_type, scheduled_date, status")
      .in("project_id", projectIds)
      .eq("status", "current");
    currentPlanNodes = (nodes ?? []).map((n) => ({
      project: nameById.get(n.project_id) ?? "",
      topic: n.topic,
      activity: n.activity_type,
      date: n.scheduled_date,
    }));
  }

  try {
    const tasks = await generateTaskSuggestions({ today, upcomingTests, weakTopics, currentPlanNodes });
    return NextResponse.json({ tasks });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[planner] task suggestion failed:", err);
    return NextResponse.json({ error: "Couldn't suggest tasks right now" }, { status: 500 });
  }
}
