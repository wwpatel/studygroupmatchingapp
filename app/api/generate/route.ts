import { createClient } from "@/lib/supabase/server";
import { generateQuizOrTest, generateFlashcards, AIGenerationError } from "@/lib/gemini/generate";
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
  const materialId = body?.materialId as string | undefined;
  const type = body?.type as "quiz" | "test" | "flashcards" | undefined;

  if (!materialId || !type || !["quiz", "test", "flashcards"].includes(type)) {
    return NextResponse.json({ error: "materialId and a valid type are required" }, { status: 400 });
  }

  const { data: material, error: materialError } = await supabase
    .from("materials")
    .select("id, content, subject, title, student_id")
    .eq("id", materialId)
    .single();

  if (materialError || !material || material.student_id !== user.id) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  try {
    const content =
      type === "flashcards"
        ? await generateFlashcards({ materialContent: material.content, subject: material.subject })
        : await generateQuizOrTest({
            materialContent: material.content,
            subject: material.subject,
            kind: type,
          });

    const { data: generated, error } = await supabase
      .from("generated_content")
      .insert({
        material_id: material.id,
        student_id: user.id,
        type,
        title: content.title,
        content: content as unknown as import("@/lib/types/database").Json,
      })
      .select("id")
      .single();

    if (error || !generated) {
      return NextResponse.json({ error: error?.message ?? "Failed to save content" }, { status: 500 });
    }

    return NextResponse.json({ contentId: generated.id });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Something went wrong generating content" }, { status: 500 });
  }
}
