"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuizContent } from "@/lib/types/content";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { celebrate } from "@/components/gamification/Celebration";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

export function QuizRunner({
  contentId,
  content,
}: {
  contentId: string;
  content: QuizContent;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const question = content.questions[index];
  const isLast = index === content.questions.length - 1;
  const answered = Object.keys(answers).length;

  function setAnswer(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generatedContentId: contentId,
          answers: content.questions.map((q) => ({
            questionId: q.id,
            studentAnswer: answers[q.id] ?? "",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't submit your attempt.");
        setSubmitting(false);
        return;
      }
      celebrate({ xpAwarded: data.xpAwarded, newBadges: data.newBadges });
      router.push(`/quiz/${contentId}/results/${data.attemptId}`);
    } catch {
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-ink-soft">
          Question {index + 1} of {content.questions.length}
        </span>
        <ProgressBar value={(answered / content.questions.length) * 100} className="flex-1" />
      </div>

      <div key={question.id} className="animate-fade-up rounded-2xl border border-line bg-paper-raised p-6">
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="butter">{question.topic}</Badge>
          <Badge tone="neutral">{question.difficulty}</Badge>
        </div>
        <p className="font-display text-lg font-medium leading-snug text-ink">{question.prompt}</p>

        <div className="mt-5 space-y-2">
          {question.kind === "mcq" ? (
            question.options.map((opt, i) => {
              const selected = answers[question.id] === String(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAnswer(String(i))}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    selected
                      ? "border-lavender bg-lavender-soft text-ink"
                      : "border-line hover:border-ink/30",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                      selected ? "border-lavender bg-lavender text-black" : "border-line-soft",
                    )}
                  >
                    {selected && <Check className="size-3" />}
                  </span>
                  {opt}
                </button>
              );
            })
          ) : (
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              placeholder="Type your answer..."
              className="w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
            />
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-5 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        {isLast ? (
          <Button onClick={handleSubmit} loading={submitting}>
            Submit
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => Math.min(content.questions.length - 1, i + 1))}>
            Next <ArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
