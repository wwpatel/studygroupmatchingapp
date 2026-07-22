import { createClient } from "@/lib/supabase/server";
import { recordEngagement } from "@/lib/gamification/engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PRIORITIES = ["low", "medium", "high"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const dueDate = body?.dueDate ? String(body.dueDate) : null;
  const priority = PRIORITIES.includes(body?.priority) ? body.priority : "medium";
  const projectId = body?.projectId ? String(body.projectId) : null;

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const { data: todo, error } = await supabase
    .from("todos")
    .insert({ student_id: user.id, title, due_date: dueDate, priority, project_id: projectId })
    .select("id, title, due_date, priority, project_id, completed")
    .single();

  if (error || !todo) {
    return NextResponse.json({ error: error?.message ?? "Failed to create task" }, { status: 500 });
  }
  return NextResponse.json({ todo });
}

// Toggle completion. Completing (not un-completing) awards XP + Planner badges.
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const completed = Boolean(body?.completed);
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data: existing } = await supabase
    .from("todos")
    .select("id, student_id, completed")
    .eq("id", id)
    .single();
  if (!existing || existing.student_id !== user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await supabase
    .from("todos")
    .update({ completed, completed_at: completed ? new Date().toISOString() : null })
    .eq("id", id);

  // Award XP only on the transition into completed (not on re-completing).
  let xpAwarded = 0;
  let newBadges: Awaited<ReturnType<typeof recordEngagement>>["newBadges"] = [];
  if (completed && !existing.completed) {
    const engagement = await recordEngagement(supabase, user.id, "todo_completed", id);
    xpAwarded = engagement.xpAwarded;
    newBadges = engagement.newBadges;
  }

  return NextResponse.json({ ok: true, xpAwarded, newBadges });
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

  await supabase.from("todos").delete().eq("id", id).eq("student_id", user.id);
  return NextResponse.json({ ok: true });
}
