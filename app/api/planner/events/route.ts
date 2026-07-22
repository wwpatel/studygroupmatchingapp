import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COLORS = ["lavender", "blush", "sage", "butter"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const date = String(body?.date ?? "").trim();
  const time = body?.time ? String(body.time) : null;
  const description = body?.description ? String(body.description) : null;
  const projectId = body?.projectId ? String(body.projectId) : null;
  const color = COLORS.includes(body?.color) ? body.color : "lavender";

  if (!title || !date) {
    return NextResponse.json({ error: "Title and date are required" }, { status: 400 });
  }

  const { data: event, error } = await supabase
    .from("calendar_events")
    .insert({
      student_id: user.id,
      title,
      date,
      time,
      description,
      project_id: projectId,
      color,
      type: "manual",
    })
    .select("id, title, date, time, color, type, project_id, description")
    .single();

  if (error || !event) {
    return NextResponse.json({ error: error?.message ?? "Failed to create event" }, { status: 500 });
  }
  return NextResponse.json({ event });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  // RLS restricts deletes to the owner; type guard keeps auto events read-only.
  await supabase.from("calendar_events").delete().eq("id", id).eq("student_id", user.id).eq("type", "manual");
  return NextResponse.json({ ok: true });
}
