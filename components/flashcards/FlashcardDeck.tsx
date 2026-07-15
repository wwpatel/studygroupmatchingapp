"use client";

import { useState } from "react";
import type { FlashcardContent } from "@/lib/types/content";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, ArrowRight, Shuffle, RotateCw } from "lucide-react";

export function FlashcardDeck({ content }: { content: FlashcardContent }) {
  const [order, setOrder] = useState(content.cards.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = content.cards[order[index]];

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => (i + delta + order.length) % order.length);
  }

  function shuffle() {
    setFlipped(false);
    setIndex(0);
    const shuffled = [...order];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setOrder(shuffled);
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-3 text-sm text-ink-soft">
        <span>
          Card {index + 1} of {order.length}
        </span>
        <button
          onClick={shuffle}
          className="flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-medium hover:border-ink/30"
        >
          <Shuffle className="size-3" /> Shuffle
        </button>
      </div>

      <div
        onClick={() => setFlipped((f) => !f)}
        className="group h-72 w-full max-w-md cursor-pointer select-none"
        style={{ perspective: "1200px" }}
      >
        <div
          className="relative h-full w-full transition-transform duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-paper-raised p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            <Badge tone="gold" className="mb-4">
              {card.topic}
            </Badge>
            <p className="font-display text-xl font-medium text-ink">{card.front}</p>
            <p className="mt-6 flex items-center gap-1 text-xs text-ink-faint">
              <RotateCw className="size-3" /> Click to flip
            </p>
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-ember/40 bg-ember-soft p-8 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-lg leading-relaxed text-ink">{card.back}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="ghost" onClick={() => go(-1)}>
          <ArrowLeft className="size-4" /> Prev
        </Button>
        <Button onClick={() => go(1)}>
          Next <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
