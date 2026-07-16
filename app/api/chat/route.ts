import { createClient } from "@/lib/supabase/server";
import { classifyMessage, streamAcademicReply, REFUSAL_MESSAGE, type ChatTurn } from "@/lib/gemini/chat";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const message = String(body?.message ?? "").trim();
  const materialId = body?.materialId ? String(body.materialId) : null;
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  let material: { title: string; subject: string; content: string } | null = null;
  if (materialId) {
    const { data: materialRow } = await supabase
      .from("materials")
      .select("title, subject, content, student_id")
      .eq("id", materialId)
      .single();
    if (materialRow && materialRow.student_id === user.id) {
      material = { title: materialRow.title, subject: materialRow.subject, content: materialRow.content };
    }
  }

  const { data: historyRows } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("student_id", user.id)
    .order("created_at", { ascending: true })
    .limit(30);

  const history: ChatTurn[] = (historyRows ?? []).map((h) => ({
    role: h.role as "user" | "assistant",
    content: h.content,
  }));

  await supabase.from("chat_history").insert({
    student_id: user.id,
    role: "user",
    content: message,
  });

  const encoder = new TextEncoder();

  // Backend-enforced scope gate: a separate classification call decides
  // whether the main tutoring model is invoked at all — off-topic messages
  // never reach it. This is stronger than relying on the chat model's own
  // in-context judgment, and can't be bypassed by mid-conversation drift.
  const verdict = await classifyMessage(message);
  console.log(`[chat] scope classifier verdict for student ${user.id}: ${verdict}`);

  if (verdict === "OFF_TOPIC") {
    await supabase.from("chat_history").insert({
      student_id: user.id,
      role: "assistant",
      content: REFUSAL_MESSAGE,
    });
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(REFUSAL_MESSAGE));
        controller.close();
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamAcademicReply(history, message, material)) {
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        }
        await supabase.from("chat_history").insert({
          student_id: user.id,
          role: "assistant",
          content: fullText || "Sorry, I couldn't generate a response.",
        });
      } catch (err) {
        const fallback =
          err instanceof Error && err.message.includes("GEMINI_API_KEY")
            ? "Nova's AI isn't configured yet — ask an admin to set GEMINI_API_KEY."
            : "Something went wrong reaching Gemini. Please try again.";
        controller.enqueue(encoder.encode(fallback));
        if (fullText) {
          await supabase.from("chat_history").insert({
            student_id: user.id,
            role: "assistant",
            content: fullText,
          });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
