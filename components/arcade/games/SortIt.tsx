"use client";

import { useMemo, useRef, useState } from "react";
import type { ArcadeTheme, SortItContent } from "@/lib/types/arcade";
import { cn } from "@/lib/utils";
import type { GameResult } from "../shared";
import { ThemedStage } from "../shared";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Drag a term into its category bucket. Native HTML5 drag on desktop; a
// click-to-select-then-click-bucket fallback makes it work on touch too.
export function SortIt({
  theme,
  content,
  onComplete,
}: {
  theme: ArcadeTheme;
  content: SortItContent;
  onComplete: (r: GameResult) => void;
}) {
  const categories = content.categories.slice(0, 4);
  const items = useMemo(() => shuffle(content.items.filter((it) => categories.includes(it.category))), // guard bad data
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const startRef = useRef(Date.now());
  const [placed, setPlaced] = useState<Record<number, string>>({}); // itemIndex -> category
  const [selected, setSelected] = useState<number | null>(null);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [missed, setMissed] = useState<Set<number>>(new Set());

  const remaining = items.map((_, i) => i).filter((i) => placed[i] === undefined);

  function place(itemIndex: number, category: string) {
    if (placed[itemIndex] !== undefined) return;
    const correct = items[itemIndex].category === category;
    if (!correct) {
      setWrongFlash(itemIndex);
      setWrongCount((w) => w + 1);
      setMissed((m) => new Set(m).add(itemIndex));
      setTimeout(() => setWrongFlash(null), 500);
      return;
    }
    const next = { ...placed, [itemIndex]: category };
    setPlaced(next);
    setSelected(null);
    if (Object.keys(next).length === items.length) finish(next);
  }

  function finish(finalPlaced: Record<number, string>) {
    const duration = Math.round((Date.now() - startRef.current) / 1000);
    const total = items.length + wrongCount;
    const accuracy = Math.round((items.length / Math.max(total, items.length)) * 100);
    onComplete({
      score: Math.max(0, items.length * 100 - wrongCount * 20),
      accuracy,
      durationSeconds: duration,
      missed: [...missed].map((i) => `${items[i].term} → ${items[i].category}`),
      extra: { "Wrong drops": wrongCount },
    });
    void finalPlaced;
  }

  return (
    <ThemedStage theme={theme}>
      <div className="mb-3 text-sm" style={{ color: theme.subtext }}>
        Drag each term into its category — or tap a term, then tap a bucket.
      </div>

      {/* Terms to sort */}
      <div className="mb-5 flex flex-wrap gap-2">
        {remaining.length === 0 ? (
          <span style={{ color: theme.subtext }}>All sorted! 🎉</span>
        ) : (
          remaining.map((i) => (
            <button
              key={i}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))}
              onClick={() => setSelected((s) => (s === i ? null : i))}
              className={cn(
                "cursor-grab rounded-lg border px-3 py-1.5 text-sm font-medium transition-all active:cursor-grabbing",
                selected === i && "ring-2 ring-offset-1",
                wrongFlash === i && "animate-pulse",
              )}
              style={{
                background: wrongFlash === i ? "var(--color-blush-soft)" : "var(--color-lavender-soft)",
                borderColor: wrongFlash === i ? "var(--color-blush)" : "var(--color-lavender)",
                color: wrongFlash === i ? "var(--color-blush-deep)" : "var(--color-lavender-deep)",
              }}
            >
              {items[i].term}
            </button>
          ))
        )}
      </div>

      {/* Category buckets */}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, minmax(0, 1fr))` }}
      >
        {categories.map((cat) => {
          const inBucket = items
            .map((_, i) => i)
            .filter((i) => placed[i] === cat);
          return (
            <div
              key={cat}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const i = Number(e.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(i)) place(i, cat);
              }}
              onClick={() => {
                if (selected !== null) place(selected, cat);
              }}
              className="min-h-32 rounded-xl border-2 border-dashed p-2.5 transition-colors"
              style={{
                borderColor: "rgba(255,255,255,0.22)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <p
                className="mb-2 text-center text-xs font-bold uppercase tracking-wide"
                style={{ color: theme.subtext }}
              >
                {cat}
              </p>
              <div className="space-y-1.5">
                {inBucket.map((i) => (
                  <div
                    key={i}
                    className="rounded-md px-2 py-1 text-center text-xs font-medium"
                    style={{ background: "var(--color-sage-soft)", color: "var(--color-sage-deep)" }}
                  >
                    {items[i].term}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ThemedStage>
  );
}
