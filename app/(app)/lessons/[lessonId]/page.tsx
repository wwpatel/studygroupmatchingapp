import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { LessonPlayer } from "@/components/lessons/LessonPlayer";
import type { LessonSegment } from "@/lib/gemini/lesson";

export default async function LessonPage({ params }: { params: { lessonId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: lesson } = await supabase
    .from("mini_lessons")
    .select("id, title, segments, material_id, student_id")
    .eq("id", params.lessonId)
    .single();

  if (!lesson || lesson.student_id !== user.id) notFound();

  const segments = lesson.segments as unknown as LessonSegment[];

  return <LessonPlayer title={lesson.title} segments={segments} materialId={lesson.material_id} />;
}
