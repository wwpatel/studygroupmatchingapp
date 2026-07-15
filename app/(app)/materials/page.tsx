import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/materials/UploadForm";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: materials } = await supabase
    .from("materials")
    .select("id, title, subject, source_type, uploaded_at, generated_content(id, type)")
    .eq("student_id", user.id)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Materials</h1>
      <p className="mt-1 text-ink-soft">
        Upload notes and Nova will generate quizzes, tests, and flashcards.
      </p>

      <div className="mt-6">
        <UploadForm />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Your materials</h2>
        {!materials || materials.length === 0 ? (
          <EmptyState icon={FileText} title="No materials yet" description="Upload your first set of notes above." />
        ) : (
          <div className="space-y-2">
            {materials.map((m) => (
              <Link key={m.id} href={`/materials/${m.id}`}>
                <Card className="transition-colors hover:border-ember/40">
                  <CardBody className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-ink">{m.title}</p>
                      <p className="text-xs text-ink-faint">
                        {m.subject} · {formatDate(m.uploaded_at)} · {m.generated_content?.length ?? 0} generated
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-ink-faint" />
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
