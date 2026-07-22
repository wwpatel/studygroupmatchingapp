import { createClient } from "@/lib/supabase/server";
import { generateStudyPlan } from "@/lib/gemini/studyplan";
import { AIGenerationError } from "@/lib/gemini/generate";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const COLORS = ["lavender", "blush", "sage", "butter"] as const;
type Color = (typeof COLORS)[number];

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const subject = String(body?.subject ?? "").trim();
  const testDates = Array.isArray(body?.testDates) ? (body.testDates as string[]) : [];
  const topics = Array.isArray(body?.topics) ? (body.topics as string[]).filter(Boolean) : [];
  const materialIds = Array.isArray(body?.materialIds) ? (body.materialIds as string[]) : [];
  const color: Color = COLORS.includes(body?.color) ? body.color : "lavender";

  if (!name || !subject) {
    return NextResponse.json({ error: "Name and subject are required" }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      student_id: user.id,
      name,
      subject,
      color,
      test_dates: testDates,
      topics,
    })
    .select("id")
    .single();

  if (error || !project) {
    return NextResponse.json({ error: error?.message ?? "Failed to create project" }, { status: 500 });
  }

  // Link any attached materials (best-effort; ignore ones not owned).
  if (materialIds.length > 0) {
    const { data: owned } = await supabase
      .from("materials")
      .select("id")
      .eq("student_id", user.id)
      .in("id", materialIds);
    const ownedIds = (owned ?? []).map((m) => m.id);
    if (ownedIds.length > 0) {
      await supabase
        .from("project_materials")
        .insert(ownedIds.map((mid) => ({ project_id: project.id, material_id: mid })));
    }
  }

  // Generate the study plan. If it fails, the project still exists (planless).
  try {
    const earliestTest = testDates
      .filter(Boolean)
      .sort()
      .find((d) => d >= todayKey()) ?? testDates.filter(Boolean).sort()[0] ?? null;

    const nodes = await generateStudyPlan({
      name,
      subject,
      topics,
      testDate: earliestTest,
      today: todayKey(),
    });

    if (nodes.length > 0) {
      await supabase.from("study_plan_nodes").insert(
        nodes.map((n, i) => ({
          project_id: project.id,
          topic: n.topic,
          activity_type: n.activityType,
          description: n.description,
          scheduled_date: n.scheduledDate || null,
          status: i === 0 ? "current" : "locked",
          order_index: i,
        })),
      );
    }
  } catch (err) {
    if (!(err instanceof AIGenerationError)) {
      console.error("[projects] study plan generation failed:", err);
    }
    // Leave the project without a plan; the UI offers a "regenerate" action.
  }

  return NextResponse.json({ projectId: project.id });
}
