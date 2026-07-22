"use client";

import { useMemo, useRef, useState } from "react";
import type { ArcadeTheme, MatchUpContent } from "@/lib/types/arcade";
import { cn } from "@/lib/utils";
import type { GameResult } from "../shared";
import { ThemedStage } from "../shared";
import { Check } from "lucide-react";

interface Tile {
  id: number;
  pairId: number;
  label: string;
  kind: "term" | "def";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchUp({
  theme,
  content,
  onComplete,
}: {
  theme: ArcadeTheme;
  content: MatchUpContent;
  onComplete: (r: GameResult) => void;
}) {
  const pairs = content.pairs.slice(0, 6);
  const tiles = useMemo<Tile[]>(() => {
    const built: Tile[] = [];
    pairs.forEach((p, i) => {
      built.push({ id: i * 2, pairId: i, label: p.term, kind: "term" });
      built.push({ id: i * 2 + 1, pairId: i, label: p.definition, kind: "def" });
    });
    return shuffle(built);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRef = useRef(Date.now());
  const [flipped, setFlipped] = useState<number[]>([]); // tile ids currently face-up
  const [matched, setMatched] = useState<Set<number>>(new Set()); // pairIds
  const [wrongPair, setWrongPair] = useState<number[]>([]); // ids showing the "wrong" flash
  const [flips, setFlips] = useState(0);
  const [misses, setMisses] = useState<Set<number>>(new Set());
  const lock = useRef(false);

  function clickTile(tile: Tile) {
    if (lock.current) return;
    if (matched.has(tile.pairId)) return;
    if (flipped.includes(tile.id)) return;

    const next = [...flipped, tile.id];
    setFlipped(next);

    if (next.length === 2) {
      setFlips((f) => f + 1);
      const [a, b] = next.map((id) => tiles.find((t) => t.id === id)!);
      if (a.pairId === b.pairId) {
        const nextMatched = new Set(matched).add(a.pairId);
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.size === pairs.length) {
          finish(nextMatched, misses);
        }
      } else {
        lock.current = true;
        setWrongPair(next);
        setMisses((m) => new Set(m).add(a.pairId).add(b.pairId));
        setTimeout(() => {
          setFlipped([]);
          setWrongPair([]);
          lock.current = false;
        }, 750);
      }
    }
  }

  function finish(matchedSet: Set<number>, missSet: Set<number>) {
    const duration = Math.round((Date.now() - startRef.current) / 1000);
    // Accuracy: perfect play = pairs flips. Extra flips reduce accuracy.
    const accuracy = Math.round((pairs.length / Math.max(flips + 1, pairs.length)) * 100);
    onComplete({
      score: Math.max(0, pairs.length * 100 - (flips + 1 - pairs.length) * 10),
      accuracy,
      durationSeconds: duration,
      missed: [...missSet].map((pid) => `${pairs[pid].term} — ${pairs[pid].definition}`),
      extra: { Flips: flips + 1 },
    });
  }

  return (
    <ThemedStage theme={theme}>
      <div className="mb-4 flex items-center justify-between text-sm" style={{ color: theme.subtext }}>
        <span>Match all {pairs.length} pairs</span>
        <span>Flips: {flips}</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {tiles.map((tile) => {
          const isMatched = matched.has(tile.pairId);
          const isFlipped = flipped.includes(tile.id) || isMatched;
          const isWrong = wrongPair.includes(tile.id);
          return (
            <button
              key={tile.id}
              onClick={() => clickTile(tile)}
              disabled={isMatched}
              className={cn(
                "relative flex h-24 items-center justify-center rounded-xl border p-2 text-center text-xs font-medium transition-all duration-200 sm:h-28 sm:text-sm",
                isMatched && "opacity-60",
              )}
              style={{
                background: isMatched
                  ? "var(--color-sage-soft)"
                  : isWrong
                    ? "var(--color-blush-soft)"
                    : isFlipped
                      ? theme.panel
                      : "rgba(255,255,255,0.06)",
                borderColor: isMatched
                  ? "var(--color-sage)"
                  : isWrong
                    ? "var(--color-blush)"
                    : "rgba(255,255,255,0.16)",
                color: isMatched
                  ? "var(--color-sage-deep)"
                  : isWrong
                    ? "var(--color-blush-deep)"
                    : isFlipped
                      ? theme.text
                      : "transparent",
              }}
            >
              {isMatched && (
                <Check className="absolute right-1.5 top-1.5 size-3.5" style={{ color: "var(--color-sage-deep)" }} />
              )}
              {isFlipped ? tile.label : <span style={{ color: theme.subtext, fontSize: 20 }}>?</span>}
            </button>
          );
        })}
      </div>
    </ThemedStage>
  );
}
