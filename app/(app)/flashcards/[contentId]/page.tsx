import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import type { FlashcardContent } from "@/lib/types/content";
import Link from "next/link";

export default async function FlashcardsPage({ params }: { params: { contentId: string } }) {
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

  if (!generated || generated.student_id !== user.id || generated.type !== "flashcards") notFound();

  const content = generated.content as unknown as FlashcardContent;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-10">
      <Link href={`/materials/${generated.material_id}`} className="text-sm text-ink-soft hover:text-ink">
        ← Back
      </Link>
      <h1 className="mt-2 mb-6 font-display text-2xl font-semibold tracking-tight text-ink">
        {generated.title}
      </h1>
      <FlashcardDeck content={content} />
    </div>
  );
}
