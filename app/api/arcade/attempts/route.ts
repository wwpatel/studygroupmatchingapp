import { createClient } from "@/lib/supabase/server";
import { recordEngagement } from "@/lib/gamification/engine";
import type { Json } from "@/lib/types/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const gameId = body?.gameId as string | undefined;
  const score = Math.max(0, Math.round(Number(body?.score ?? 0)));
  const accuracy = Math.max(0, Math.min(100, Number(body?.accuracy ?? 0)));
  const durationSeconds = Math.max(0, Math.round(Number(body?.durationSeconds ?? 0)));
  const details = (body?.details ?? {}) as Json;

  if (!gameId) {
    return NextResponse.json({ error: "gameId is required" }, { status: 400 });
  }

  // Verify the game belongs to this student.
  const { data: game } = await supabase
    .from("arcade_games")
    .select("id, student_id")
    .eq("id", gameId)
    .single();
  if (!game || game.student_id !== user.id) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const { data: attempt, error } = await supabase
    .from("arcade_attempts")
    .insert({
      student_id: user.id,
      game_id: gameId,
      score,
      accuracy,
      duration_seconds: durationSeconds,
      details,
    })
    .select("id")
    .single();

  if (error || !attempt) {
    return NextResponse.json({ error: error?.message ?? "Failed to save attempt" }, { status: 500 });
  }

  const engagement = await recordEngagement(supabase, user.id, "arcade_game_played", attempt.id);

  return NextResponse.json({
    attemptId: attempt.id,
    xpAwarded: engagement.xpAwarded,
    streak: engagement.streak,
    newBadges: engagement.newBadges,
  });
}
