import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GenerateButton } from "@/components/materials/GenerateButton";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { FileQuestion, ClipboardList, Layers, ArrowRight } from "lucide-react";

const TYPE_META = {
  quiz: { icon: FileQuestion, label: "Quiz", generateLabel: "Generate a quiz" },
  test: { icon: ClipboardList, label: "Practice test", generateLabel: "Generate a practice test" },
  flashcards: { icon: Layers, label: "Flashcards", generateLabel: "Generate flashcards" },
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-10">
      <Link href="/materials" className="text-sm text-ink-soft hover:text-ink">
        ← Materials
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {material.title}
        </h1>
        <Badge tone="gold">{material.subject}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-faint">Uploaded {formatDate(material.uploaded_at)}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((type) => {
          const meta = TYPE_META[type];
          const Icon = meta.icon;
          const items = byType[type];
          return (
            <Card key={type}>
              <CardBody>
                <div className="flex size-9 items-center justify-center rounded-lg bg-ember-soft">
                  <Icon className="size-4.5 text-ember-dark" strokeWidth={1.75} />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold text-ink">{meta.label}</h3>

                {items.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {items.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={type === "flashcards" ? `/flashcards/${item.id}` : `/quiz/${item.id}`}
                          className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm text-ink transition-colors hover:border-ember/40"
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
