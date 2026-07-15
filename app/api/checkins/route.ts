import { createClient } from "@/lib/supabase/server";
import { getOrCreateTopic, applyCheckinAdjustment } from "@/lib/skill";
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
  const sessionId = body?.sessionId as string | undefined;
  const topicName = body?.topicName as string | undefined;
  const confidenceBefore = Number(body?.confidenceBefore);
  const confidenceAfter = Number(body?.confidenceAfter);

  if (
    !sessionId ||
    !topicName ||
    !Number.isInteger(confidenceBefore) ||
    !Number.isInteger(confidenceAfter) ||
    confidenceBefore < 1 ||
    confidenceBefore > 5 ||
    confidenceAfter < 1 ||
    confidenceAfter > 5
  ) {
    return NextResponse.json({ error: "Invalid check-in payload" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, group_id, groups(subject)")
    .eq("id", sessionId)
    .single();
  const subject = (session as unknown as { groups: { subject: string } | null } | null)?.groups
    ?.subject;

  if (!session || !subject) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const topicId = await getOrCreateTopic(supabase, subject, topicName);

  const { error } = await supabase.from("checkins").insert({
    student_id: user.id,
    session_id: sessionId,
    topic_id: topicId,
    confidence_before: confidenceBefore,
    confidence_after: confidenceAfter,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await applyCheckinAdjustment(supabase, user.id, topicId, confidenceBefore, confidenceAfter);

  return NextResponse.json({ ok: true });
}
