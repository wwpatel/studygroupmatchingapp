"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Sparkles } from "lucide-react";

export function GenerateLessonButton({ materialId }: { materialId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't build a mini-lesson.");
        setLoading(false);
        return;
      }
      router.push(`/lessons/${data.lessonId}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleClick} loading={loading} variant="secondary" className="w-full">
        <Sparkles className="size-4" />
        {loading ? "Building lesson..." : "Generate mini-lesson"}
      </Button>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
