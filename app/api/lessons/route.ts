import { createClient } from "@/lib/supabase/server";
import { generateMiniLesson } from "@/lib/gemini/lesson";
import { AIGenerationError } from "@/lib/gemini/generate";
import type { Json } from "@/lib/types/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const materialId = String(body?.materialId ?? "");
  if (!materialId) return NextResponse.json({ error: "materialId is required" }, { status: 400 });

  const { data: material } = await supabase
    .from("materials")
    .select("id, title, subject, content, student_id")
    .eq("id", materialId)
    .single();
  if (!material || material.student_id !== user.id) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  try {
    const lesson = await generateMiniLesson({
      materialContent: material.content,
      subject: material.subject,
      materialTitle: material.title,
    });

    const { data: saved, error } = await supabase
      .from("mini_lessons")
      .insert({
        material_id: material.id,
        student_id: user.id,
        title: lesson.title,
        segments: lesson.segments as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !saved) {
      return NextResponse.json({ error: error?.message ?? "Failed to save lesson" }, { status: 500 });
    }
    return NextResponse.json({ lessonId: saved.id });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[lessons] generation failed:", err);
    return NextResponse.json({ error: "Something went wrong building the lesson" }, { status: 500 });
  }
}
