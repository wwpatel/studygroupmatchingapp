import { createClient } from "@/lib/supabase/server";
import { checkMetricBadges } from "@/lib/gamification/engine";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_CHARS = 60000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let title: string;
  let subject: string;
  let sourceType: "pdf" | "text" | "pasted";
  let content: string;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      title = String(form.get("title") ?? "").trim();
      subject = String(form.get("subject") ?? "").trim();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      sourceType = "pdf";
      const buffer = Buffer.from(await file.arrayBuffer());
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      await parser.destroy();
      content = parsed.text.trim();
      if (content.length < 40) {
        return NextResponse.json(
          { error: "Couldn't extract readable text from that PDF. Try pasting the text instead." },
          { status: 422 },
        );
      }
    } else {
      const body = await request.json();
      title = String(body.title ?? "").trim();
      subject = String(body.subject ?? "").trim();
      content = String(body.content ?? "").trim();
      sourceType = "pasted";
      if (content.length < 40) {
        return NextResponse.json(
          { error: "Please paste at least a few sentences of material." },
          { status: 422 },
        );
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read upload" },
      { status: 400 },
    );
  }

  if (!title || !subject) {
    return NextResponse.json({ error: "Title and subject are required." }, { status: 400 });
  }

  const truncated = content.slice(0, MAX_CHARS);

  const { data: material, error } = await supabase
    .from("materials")
    .insert({
      student_id: user.id,
      title,
      subject,
      source_type: sourceType,
      content: truncated,
    })
    .select("id")
    .single();

  if (error || !material) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to save material" },
      { status: 500 },
    );
  }

  // Bookworm badges (upload counts aren't an XP event, just a badge metric).
  const newBadges = await checkMetricBadges(supabase, user.id, "materials");

  return NextResponse.json({ materialId: material.id, newBadges });
}
