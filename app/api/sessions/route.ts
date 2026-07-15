import { createClient } from "@/lib/supabase/server";
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
  const action = body?.action as "propose" | "confirm" | "complete" | undefined;
  const time = body?.time as string | undefined;

  if (!sessionId || !action) {
    return NextResponse.json({ error: "sessionId and action are required" }, { status: 400 });
  }

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("id, proposed_times, group_id, status")
    .eq("id", sessionId)
    .single();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (action === "propose") {
    if (!time) return NextResponse.json({ error: "time is required" }, { status: 400 });
    const next = Array.from(new Set([...(session.proposed_times ?? []), time]));
    const { error } = await supabase
      .from("sessions")
      .update({ proposed_times: next, proposed_by: user.id })
      .eq("id", sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "confirm") {
    if (!time) return NextResponse.json({ error: "time is required" }, { status: 400 });
    const { error } = await supabase
      .from("sessions")
      .update({ scheduled_time: time, status: "confirmed" })
      .eq("id", sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "complete") {
    const { error } = await supabase
      .from("sessions")
      .update({ status: "completed" })
      .eq("id", sessionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
