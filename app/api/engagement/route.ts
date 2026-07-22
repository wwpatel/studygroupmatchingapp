import { createClient } from "@/lib/supabase/server";
import { recordEngagement } from "@/lib/gamification/engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Client-reported engagement events. Only sources that genuinely originate on
// the client belong here (e.g. finishing a flashcard pass, which has no other
// server touchpoint) — server-side actions award XP in their own routes.
// recordEngagement dedupes farm-able sources per day.
const CLIENT_SOURCES = ["flashcards_reviewed"] as const;
type ClientSource = (typeof CLIENT_SOURCES)[number];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const source = body?.source as ClientSource | undefined;
  const sourceId = body?.sourceId ? String(body.sourceId) : null;

  if (!source || !CLIENT_SOURCES.includes(source)) {
    return NextResponse.json({ error: "Invalid engagement source" }, { status: 400 });
  }

  // Verify the referenced content actually belongs to this student.
  if (sourceId) {
    const { data: content } = await supabase
      .from("generated_content")
      .select("id, student_id")
      .eq("id", sourceId)
      .single();
    if (!content || content.student_id !== user.id) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }
  }

  const result = await recordEngagement(supabase, user.id, source, sourceId);
  return NextResponse.json(result);
}
