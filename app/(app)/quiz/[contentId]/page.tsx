import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import type { QuizContent } from "@/lib/types/content";
import Link from "next/link";

export default async function QuizPage({ params }: { params: { contentId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: generated } = await supabase
    .from("generated_content")
    .select("id, title, type, content, student_id, material_id")
    .eq("id", params.contentId)
    .single();

  if (!generated || generated.student_id !== user.id) notFound();
  if (generated.type !== "quiz" && generated.type !== "test") notFound();

  const content = generated.content as unknown as QuizContent;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-10">
      <Link
        href={generated.material_id ? `/materials/${generated.material_id}` : "/chat"}
        className="text-sm text-ink-soft hover:text-ink"
      >
        ← Back
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">
        {generated.title}
      </h1>
      <div className="mt-6">
        <QuizRunner contentId={generated.id} content={content} />
      </div>
    </div>
  );
}
