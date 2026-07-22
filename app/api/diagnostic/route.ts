import { createClient } from "@/lib/supabase/server";
import { generateDiagnosticQuiz, AIGenerationError } from "@/lib/gemini/generate";
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
  const subject = String(body?.subject ?? "").trim();
  if (!subject) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }

  try {
    const content = await generateDiagnosticQuiz(subject);

    // Diagnostic quizzes aren't tied to an uploaded document, but
    // generated_content requires a material_id — record a lightweight
    // synthetic material so the FK and downstream UI stay uniform.
    const { data: material, error: materialError } = await supabase
      .from("materials")
      .insert({
        student_id: user.id,
        title: `Diagnostic: ${subject}`,
        subject,
        source_type: "text",
        content: `Standalone diagnostic quiz for ${subject}, generated without source material.`,
      })
      .select("id")
      .single();

    if (materialError || !material) {
      return NextResponse.json({ error: "Failed to set up diagnostic" }, { status: 500 });
    }

    const { data: generated, error } = await supabase
      .from("generated_content")
      .insert({
        material_id: material.id,
        student_id: user.id,
        type: "quiz",
        title: content.title,
        content: content as unknown as import("@/lib/types/database").Json,
      })
      .select("id")
      .single();

    if (error || !generated) {
      return NextResponse.json({ error: error?.message ?? "Failed to save diagnostic" }, { status: 500 });
    }

    return NextResponse.json({ contentId: generated.id });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong generating the diagnostic" }, { status: 500 });
  }
}
