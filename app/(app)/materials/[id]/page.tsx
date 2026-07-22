import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GenerateButton } from "@/components/materials/GenerateButton";
import { GenerateLessonButton } from "@/components/materials/GenerateLessonButton";
import { cn, formatDate } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FileQuestion, ClipboardList, Layers, ArrowRight, MessageCircle, PlayCircle, GraduationCap } from "lucide-react";

const TYPE_META = {
  quiz: { icon: FileQuestion, label: "Quiz", generateLabel: "Generate a quiz", tone: "lavender" },
  test: { icon: ClipboardList, label: "Practice test", generateLabel: "Generate a practice test", tone: "butter" },
  flashcards: { icon: Layers, label: "Flashcards", generateLabel: "Generate flashcards", tone: "blush" },
} as const;

export default async function MaterialDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: material } = await supabase
    .from("materials")
    .select("id, title, subject, content, uploaded_at, student_id")
    .eq("id", params.id)
    .single();

  if (!material || material.student_id !== user.id) notFound();

  const { data: generatedList } = await supabase
    .from("generated_content")
    .select("id, type, title, created_at")
    .eq("material_id", material.id)
    .order("created_at", { ascending: false });

  const byType = {
    quiz: generatedList?.filter((g) => g.type === "quiz") ?? [],
    test: generatedList?.filter((g) => g.type === "test") ?? [],
    flashcards: generatedList?.filter((g) => g.type === "flashcards") ?? [],
  };

  const { data: lessons } = await supabase
    .from("mini_lessons")
    .select("id, title, created_at")
    .eq("material_id", material.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-10">
      <Link href="/materials" className="text-sm text-ink-soft hover:text-ink">
        ← Materials
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {material.title}
        </h1>
        <Badge tone="butter">{material.subject}</Badge>
      </div>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-sm text-ink-faint">Uploaded {formatDate(material.uploaded_at)}</p>
        <Link href={`/chat?material=${material.id}`}>
          <Button size="sm" variant="secondary">
            <MessageCircle className="size-3.5" />
            Ask Nova about this
          </Button>
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          const items = byType[type];
          return (
            <Card key={type}>
              <CardBody>
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    meta.tone === "lavender" && "bg-lavender-soft",
                    meta.tone === "butter" && "bg-butter-soft",
                    meta.tone === "blush" && "bg-blush-soft",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4.5",
                      meta.tone === "lavender" && "text-lavender-deep",
                      meta.tone === "butter" && "text-butter-deep",
                      meta.tone === "blush" && "text-blush-deep",
                    )}
                    strokeWidth={1.75}
                  />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-ink">{meta.label}</h3>

                {items.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={type === "flashcards" ? `/flashcards/${item.id}` : `/quiz/${item.id}`}
                          className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-lavender/40"
                        >
                          <span>{formatDate(item.created_at)}</span>
                          <ArrowRight className="size-3.5 text-ink-faint" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3">
                  <GenerateButton materialId={material.id} type={type} label={meta.generateLabel} />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sage-soft">
                <GraduationCap className="size-4.5 text-sage-deep" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-ink">Learn this material</h3>
                <p className="text-sm text-ink-soft">
                  A short narrated mini-lesson that teaches this material back to you, segment by segment.
                </p>
              </div>
            </div>
            <div className="shrink-0 sm:w-56">
              <GenerateLessonButton materialId={material.id} />
            </div>
          </div>

          {lessons && lessons.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
              {lessons.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/lessons/${l.id}`}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-sage/50"
                  >
                    <span className="flex items-center gap-2">
                      <PlayCircle className="size-4 text-sage-deep" />
                      {l.title}
                    </span>
                    <span className="text-xs text-ink-faint">{formatDate(l.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <h3 className="font-display text-base font-semibold text-ink">Source material</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft line-clamp-[12]">
            {material.content}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
