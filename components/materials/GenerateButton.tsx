"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

export function GenerateButton({
  materialId,
  type,
  label,
}: {
  materialId: string;
  type: "quiz" | "test" | "flashcards";
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        setLoading(false);
        return;
      }
      const dest = type === "flashcards" ? `/flashcards/${data.contentId}` : `/quiz/${data.contentId}`;
      router.push(dest);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} loading={loading} variant="secondary" className="w-full">
        <Sparkles className="size-4" />
        {label}
      </Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
