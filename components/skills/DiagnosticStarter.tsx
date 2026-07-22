"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

export function DiagnosticStarter({ suggestedSubjects }: { suggestedSubjects: string[] }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(chosenSubject: string) {
    if (!chosenSubject.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: chosenSubject.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't build a diagnostic quiz.");
        setLoading(false);
        return;
      }
      router.push(`/quiz/${data.contentId}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(subject);
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Label htmlFor="diagnostic-subject">Subject</Label>
          <Input
            id="diagnostic-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Algebra II, US History, Chemistry"
          />
        </div>
        <Button type="submit" loading={loading} disabled={!subject.trim()}>
          <Sparkles className="size-4" />
          Start diagnostic
        </Button>
      </form>

      {suggestedSubjects.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedSubjects.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSubject(s);
                start(s);
              }}
              className="rounded-full border border-line px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:border-lavender/40 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
