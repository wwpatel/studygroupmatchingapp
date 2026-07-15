import { createClient } from "@/lib/supabase/server";
import { anthropic, MODEL } from "@/lib/anthropic/client";
import { CHAT_SYSTEM_PROMPT } from "@/lib/anthropic/chat";
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
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const { data: history } = await supabase
    .from("chat_history")
    .select("role, content")
    .eq("student_id", user.id)
    .order("created_at", { ascending: true })
    .limit(30);

  await supabase.from("chat_history").insert({
    student_id: user.id,
    role: "user",
    content: message,
  });

  const messages = [
    ...(history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: message },
  ];

  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 2048,
          system: CHAT_SYSTEM_PROMPT,
          messages,
        });

        claudeStream.on("text", (delta) => {
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        });

        await claudeStream.finalMessage();
        await supabase.from("chat_history").insert({
          student_id: user.id,
          role: "assistant",
          content: fullText || "Sorry, I couldn't generate a response.",
        });
      } catch {
        const fallback = "\n\nSomething went wrong reaching Claude. Please try again.";
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
