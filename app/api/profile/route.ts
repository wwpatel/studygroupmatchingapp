import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const update: { name?: string; avatar?: string } = {};

  if (typeof body?.name === "string" && body.name.trim()) {
    update.name = body.name.trim().slice(0, 60);
  }
  if (typeof body?.avatar === "string") {
    // Store a single emoji (or short string). Cap length defensively.
    update.avatar = body.avatar.slice(0, 8);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase.from("students").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, ...update });
}
