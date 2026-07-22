import { createClient } from "@/lib/supabase/server";
import { recordEngagement } from "@/lib/gamification/engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Mark a study-plan node complete. Advances the next locked node to "current",
// and awards study-plan-node XP. Verifies ownership via the parent project.
export async function POST(request: Request, { params }: { params: { nodeId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: node } = await supabase
    .from("study_plan_nodes")
    .select("id, project_id, order_index, status, projects!inner(student_id)")
    .eq("id", params.nodeId)
    .single();

  const ownerId = (node as unknown as { projects: { student_id: string } | null } | null)?.projects
    ?.student_id;
  if (!node || ownerId !== user.id) {
    return NextResponse.json({ error: "Node not found" }, { status: 404 });
  }

  if (node.status === "completed") {
    return NextResponse.json({ ok: true, alreadyComplete: true });
  }

  await supabase
    .from("study_plan_nodes")
    .update({ status: "completed" })
    .eq("id", node.id);

  // Promote the next locked node in this project to "current".
  const { data: nextNode } = await supabase
    .from("study_plan_nodes")
    .select("id")
    .eq("project_id", node.project_id)
    .eq("status", "locked")
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (nextNode) {
    await supabase.from("study_plan_nodes").update({ status: "current" }).eq("id", nextNode.id);
  }

  const engagement = await recordEngagement(supabase, user.id, "study_plan_node_completed", node.id);

  return NextResponse.json({
    ok: true,
    xpAwarded: engagement.xpAwarded,
    streak: engagement.streak,
    newBadges: engagement.newBadges,
  });
}
