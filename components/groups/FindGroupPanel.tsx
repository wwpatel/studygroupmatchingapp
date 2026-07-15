"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Users2, Sparkles } from "lucide-react";

export function FindGroupPanel({ subjects }: { subjects: string[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function findGroup(subject: string) {
    setLoading(subject);
    setError(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't form a group right now.");
        setLoading(null);
        return;
      }
      router.push(`/groups/${data.groupId}`);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(null);
    }
  }

  if (subjects.length === 0) {
    return (
      <Card>
        <CardBody className="text-center">
          <Users2 className="mx-auto size-6 text-ink-faint" />
          <p className="mt-2 text-sm text-ink-soft">
            Take a diagnostic quiz on the{" "}
            <a href="/skills" className="font-medium text-ink underline underline-offset-2">
              skill profile
            </a>{" "}
            page to unlock group matching.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <h2 className="font-display text-lg font-semibold text-ink">Find a group</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Nova matches you with classmates whose strengths cover your growth areas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {subjects.map((s) => (
            <Button key={s} size="sm" variant="secondary" loading={loading === s} onClick={() => findGroup(s)}>
              <Sparkles className="size-3.5" />
              {s}
            </Button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
