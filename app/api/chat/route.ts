import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  classifyMessage,
  streamAcademicReply,
  summarizeStudentContext,
  detectQuizIntent,
  REFUSAL_MESSAGE,
  type ChatTurn,
} from "@/lib/gemini/chat";
import {
  generateQuizOrTest,
  generateTopicQuiz,
  generateFlashcards,
  generateTopicFlashcards,
} from "@/lib/gemini/generate";
import { recordEngagement } from "@/lib/gamification/engine";
import { CHAT_SESSION_MESSAGE_THRESHOLD } from "@/lib/gamification/constants";
import type { Json } from "@/lib/types/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// How many of the most recent messages to pass to the model verbatim. Older
// messages beyond this window get condensed into the student's rolling summary.
const RECENT_WINDOW = 20;
// Only fold older messages into the summary once at least this many have
// accrued past the recent window — avoids re-summarizing on every single turn.
const SUMMARY_BATCH = 10;

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

  let material: { id: string; title: string; subject: string; content: string } | null = null;
  if (materialId) {
    const { data: materialRow } = await supabase
      .from("materials")
      .select("id, title, subject, content, student_id")
      .eq("id", materialId)
      .single();
    if (materialRow && materialRow.student_id === user.id) {
      material = { id: materialRow.id, title: materialRow.title, subject: materialRow.subject, content: materialRow.content };
    }
  }

  // Long-term memory: a condensed summary of older sessions, plus a watermark
  // marking how far chat_history has already been folded into it. Degrades
  // gracefully if the memory columns haven't been added to the DB yet.
  let studentContext: string | null = null;
  let summaryUpto: string | null = null;
  {
    const { data: studentRow, error: studentErr } = await supabase
      .from("students")
      .select("context_summary, context_summary_upto")
      .eq("id", user.id)
      .single();
    if (!studentErr && studentRow) {
      studentContext = studentRow.context_summary ?? null;
      summaryUpto = studentRow.context_summary_upto ?? null;
    }
  }

  // Recent history = the most recent messages not yet folded into the summary,
  // returned newest-first then reversed to chronological order. (The previous
  // implementation used ascending + limit, which pulled the OLDEST messages and
  // froze memory once history grew past the limit.)
  let recentQuery = supabase
    .from("chat_history")
    .select("role, content, created_at")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(RECENT_WINDOW);
  if (summaryUpto) recentQuery = recentQuery.gt("created_at", summaryUpto);
  const { data: recentRows } = await recentQuery;

  const history: ChatTurn[] = (recentRows ?? [])
    .slice()
    .reverse()
    .map((h) => ({
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

  // Chat study-session XP: once the student's Nth on-topic message of the day
  // lands, count it as a study session. recordEngagement dedupes per day, so
  // this can run on every message past the threshold without double-awarding.
  // Best-effort — never blocks or breaks the reply.
  try {
    const { count: todayCount } = await supabase
      .from("chat_history")
      .select("id", { count: "exact", head: true })
      .eq("student_id", user.id)
      .eq("role", "user")
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
    if ((todayCount ?? 0) >= CHAT_SESSION_MESSAGE_THRESHOLD) {
      await recordEngagement(supabase, user.id, "chat_study_session");
    }
  } catch (err) {
    console.warn("[chat] chat-session XP check skipped:", err);
  }

  // In-chat quiz generation: if the student is asking to be quizzed right
  // now, skip the streaming tutor reply and generate+save a quiz directly,
  // returning it as JSON so the client can render it inline. Reuses the same
  // generation functions and generated_content/attempts pipeline as the
  // Course Materials flow — same quality bar, same skill-profile feed.
  const { data: materialsList } = await supabase
    .from("materials")
    .select("id, title, subject")
    .eq("student_id", user.id);

  const intent = await detectQuizIntent(message, history, materialsList ?? [], material);
  console.log(`[chat] quiz-intent for student ${user.id}: ${JSON.stringify(intent)}`);

  if (intent.wantsQuiz && intent.topic.trim()) {
    try {
      // Resolve the grounding material: the active one (clearest signal), or
      // one the intent detector matched by title/subject, or none.
      let groundingMaterial: { id: string; content: string; subject: string } | null =
        material;
      if (!groundingMaterial && intent.matchedMaterialId) {
        const { data: matchedMaterial } = await supabase
          .from("materials")
          .select("id, content, subject, student_id")
          .eq("id", intent.matchedMaterialId)
          .single();
        if (matchedMaterial && matchedMaterial.student_id === user.id) {
          groundingMaterial = matchedMaterial;
        }
      }
      const usedMaterialId = groundingMaterial?.id ?? null;

      // Flashcards take a separate render path (FlashcardDeck, not QuizRunner).
      if (intent.kind === "flashcards") {
        const flashContent = groundingMaterial
          ? await generateFlashcards({
              materialContent: groundingMaterial.content,
              subject: groundingMaterial.subject,
            })
          : await generateTopicFlashcards({
              topic: intent.topic,
              subject: intent.subject || intent.topic,
            });

        const { data: generated, error: genError } = await supabase
          .from("generated_content")
          .insert({
            material_id: usedMaterialId,
            student_id: user.id,
            type: "flashcards",
            title: flashContent.title,
            content: flashContent as unknown as Json,
          })
          .select("id")
          .single();
        if (genError || !generated) {
          throw new Error(genError?.message ?? "Failed to save generated flashcards");
        }

        const introText = `Here's a ${flashContent.cards.length}-card flashcard set on **${flashContent.title}** — flip through them right here, or revisit anytime at [this link](/flashcards/${generated.id}).`;
        await supabase.from("chat_history").insert({
          student_id: user.id,
          role: "assistant",
          content: introText,
        });
        return NextResponse.json({
          type: "flashcards",
          message: introText,
          flashcards: { contentId: generated.id, content: flashContent },
        });
      }

      let quizContent: Awaited<ReturnType<typeof generateQuizOrTest>>;
      if (groundingMaterial) {
        quizContent = await generateQuizOrTest({
          materialContent: groundingMaterial.content,
          subject: groundingMaterial.subject,
          kind: intent.kind,
        });
      } else {
        quizContent = await generateTopicQuiz({
          topic: intent.topic,
          subject: intent.subject || intent.topic,
          kind: intent.kind,
        });
      }

      const { data: generated, error: genError } = await supabase
        .from("generated_content")
        .insert({
          material_id: usedMaterialId,
          student_id: user.id,
          type: intent.kind,
          title: quizContent.title,
          content: quizContent as unknown as Json,
        })
        .select("id")
        .single();

      if (genError || !generated) {
        throw new Error(genError?.message ?? "Failed to save generated quiz");
      }

      const introText = `Here's a ${quizContent.questions.length}-question ${intent.kind} on **${quizContent.title}** — good luck! You can also revisit it anytime at [this link](/quiz/${generated.id}).`;

      await supabase.from("chat_history").insert({
        student_id: user.id,
        role: "assistant",
        content: introText,
      });

      return NextResponse.json({
        type: "quiz",
        message: introText,
        quiz: { contentId: generated.id, content: quizContent },
      });
    } catch (err) {
      // Best-effort: if in-chat quiz generation fails for any reason, fall
      // through to a normal tutoring reply rather than erroring the chat out.
      console.error("[chat] in-chat quiz generation failed, falling back to normal reply:", err);
    }
  }

  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of streamAcademicReply(history, message, material, studentContext)) {
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        }
        await supabase.from("chat_history").insert({
          student_id: user.id,
          role: "assistant",
          content: fullText || "Sorry, I couldn't generate a response.",
        });
        // Fold older-than-recent history into the rolling summary once enough
        // has accrued. Best-effort — never blocks or breaks the chat response.
        await maybeUpdateStudentContext(supabase, user.id, studentContext, summaryUpto);
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

/**
 * Fold messages older than the recent window into the student's rolling
 * summary, then advance the watermark. Best-effort and strictly per-student:
 * any failure (including the memory columns not existing yet) is logged and
 * ignored so it never breaks the chat response.
 */
async function maybeUpdateStudentContext(
  supabase: SupabaseClient<Database>,
  studentId: string,
  priorSummary: string | null,
  summaryUpto: string | null,
): Promise<void> {
  try {
    let q = supabase
      .from("chat_history")
      .select("role, content, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (summaryUpto) q = q.gt("created_at", summaryUpto);
    const { data: rows } = await q;
    const msgs = rows ?? [];

    // Keep the most recent RECENT_WINDOW verbatim; only summarize once at least
    // SUMMARY_BATCH older messages have piled up beyond that window.
    if (msgs.length <= RECENT_WINDOW + SUMMARY_BATCH) return;

    const toFold = msgs.slice(0, msgs.length - RECENT_WINDOW);
    const newWatermark = toFold[toFold.length - 1].created_at;
    const turns: ChatTurn[] = toFold.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const summary = await summarizeStudentContext(priorSummary, turns);

    const { error: updateErr } = await supabase
      .from("students")
      .update({ context_summary: summary, context_summary_upto: newWatermark })
      .eq("id", studentId);
    if (updateErr) throw updateErr;
  } catch (err) {
    console.warn(
      "[chat] student-context summary update skipped:",
      err instanceof Error ? err.message : err,
    );
  }
}
