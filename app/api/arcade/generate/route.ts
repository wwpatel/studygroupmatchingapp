import { createClient } from "@/lib/supabase/server";
import { generateArcadeContent, isValidArcadeContent } from "@/lib/gemini/arcade";
import { AIGenerationError } from "@/lib/gemini/generate";
import type { GameType } from "@/lib/types/arcade";
import type { Json } from "@/lib/types/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const GAME_TYPES: GameType[] = ["match_up", "term_blaster", "sort_it", "fill_gap"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const gameType = body?.gameType as GameType | undefined;
  const theme = (body?.theme as string | undefined) ?? "minimal";
  const materialId = body?.materialId ? String(body.materialId) : null;
  let topic = String(body?.topic ?? "").trim();
  let subject = String(body?.subject ?? "").trim();

  if (!gameType || !GAME_TYPES.includes(gameType)) {
    return NextResponse.json({ error: "A valid gameType is required" }, { status: 400 });
  }

  // Resolve grounding: an uploaded material (owned by this user) or a topic.
  let materialContent: string | null = null;
  if (materialId) {
    const { data: material } = await supabase
      .from("materials")
      .select("id, title, subject, content, student_id")
      .eq("id", materialId)
      .single();
    if (!material || material.student_id !== user.id) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }
    materialContent = material.content;
    subject = subject || material.subject;
    topic = topic || material.title;
  }

  if (!topic) {
    return NextResponse.json({ error: "A topic or material is required" }, { status: 400 });
  }
  if (!subject) subject = topic;

  try {
    const content = await generateArcadeContent({ gameType, subject, topic, materialContent });
    if (!isValidArcadeContent(gameType, content)) {
      return NextResponse.json(
        { error: "Nova couldn't build a valid game from that. Try a different topic or game type." },
        { status: 502 },
      );
    }

    const { data: game, error } = await supabase
      .from("arcade_games")
      .insert({
        student_id: user.id,
        game_type: gameType,
        theme,
        topic,
        subject,
        material_id: materialId,
        content: content as unknown as Json,
      })
      .select("id")
      .single();

    if (error || !game) {
      return NextResponse.json({ error: error?.message ?? "Failed to save game" }, { status: 500 });
    }

    return NextResponse.json({ gameId: game.id });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[arcade] generation failed:", err);
    return NextResponse.json({ error: "Something went wrong generating the game" }, { status: 500 });
  }
}
