import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { QuizContent, AnswerRecord } from "@/lib/types/content";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function QuizResultsPage({
  params,
}: {
  params: { contentId: string; attemptId: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: generated }, { data: attempt }] = await Promise.all([
    supabase
      .from("generated_content")
      .select("id, title, content, student_id, material_id")
      .eq("id", params.contentId)
      .single(),
    supabase
      .from("attempts")
      .select("id, score, max_score, answers, student_id, created_at")
      .eq("id", params.attemptId)
      .single(),
  ]);

  if (
    !generated ||
    !attempt ||
    generated.student_id !== user.id ||
    attempt.student_id !== user.id
  ) {
    notFound();
  }

  const content = generated.content as unknown as QuizContent;
  const answers = attempt.answers as unknown as AnswerRecord[];
  const pct = Math.round((attempt.score / attempt.max_score) * 100);

  return (
    <div className="mx-auto max-w-2xl px-6 py-8 md:py-10">
      <Link href={`/materials/${generated.material_id}`} className="text-sm text-ink-soft hover:text-ink">
        ← Back to material
      </Link>

      <Card className="mt-4">
        <CardBody className="flex flex-col items-center py-8 text-center">
          <div
            className="font-display text-5xl font-semibold"
            style={{ color: pct >= 70 ? "var(--color-teal)" : "var(--color-ember)" }}
          >
            {pct}%
          </div>
          <p className="mt-2 text-ink-soft">
            {attempt.score} / {attempt.max_score} correct — {generated.title}
          </p>
          <div className="mt-5 flex gap-3">
            <Link href={`/quiz/${generated.id}`}>
              <Button variant="secondary">Retake</Button>
            </Link>
            <Link href="/skills">
              <Button>View skill profile</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 space-y-3">
        {content.questions.map((q, i) => {
          const record = answers.find((a) => a.questionId === q.id);
          const isCorrect = record?.isCorrect ?? false;
          return (
            <Card key={q.id}>
              <CardBody>
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal" />
                  ) : (
                    <XCircle className="mt-0.5 size-5 shrink-0 text-danger" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge tone="gold">{q.topic}</Badge>
                      <span className="text-xs text-ink-faint">Q{i + 1}</span>
                    </div>
                    <p className="text-sm font-medium text-ink">{q.prompt}</p>
                    <p className="mt-2 text-sm text-ink-soft">
                      Your answer:{" "}
                      <span className={isCorrect ? "text-teal-dark" : "text-danger"}>
                        {record?.studentAnswer || "(no answer)"}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="mt-1 text-sm text-ink-soft">
                        Correct answer: <span className="text-ink">{record?.correctAnswer}</span>
                      </p>
                    )}
                    <p className="mt-2 text-sm text-ink-faint">{q.explanation}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
