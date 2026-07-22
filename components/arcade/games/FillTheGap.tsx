"use client";

import { useMemo, useRef, useState } from "react";
import type { ArcadeTheme, FillGapContent } from "@/lib/types/arcade";
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

export function FillTheGap({
  theme,
  content,
  onComplete,
}: {
  theme: ArcadeTheme;
  content: FillGapContent;
  onComplete: (r: GameResult) => void;
}) {
  const items = content.items.slice(0, 8);
  const startRef = useRef(Date.now());
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  const item = items[index];
  const options = useMemo(() => {
    const opts = item.options && item.options.length >= 2 ? item.options : [item.answer];
    return shuffle([...new Set(opts)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const parts = item.sentence.split("____");

  function pick(opt: string) {
    if (picked) return;
    setPicked(opt);
    const isCorrect = opt.trim().toLowerCase() === item.answer.trim().toLowerCase();
    if (isCorrect) setCorrect((c) => c + 1);
    else setMissed((m) => [...m, `${item.sentence.replace("____", `[${item.answer}]`)}`]);

    setTimeout(() => {
      if (index + 1 >= items.length) {
        const duration = Math.round((Date.now() - startRef.current) / 1000);
        const finalCorrect = correct + (isCorrect ? 1 : 0);
        onComplete({
          score: finalCorrect * 100,
          accuracy: Math.round((finalCorrect / items.length) * 100),
          durationSeconds: duration,
          missed: isCorrect ? missed : [...missed, item.sentence.replace("____", `[${item.answer}]`)],
        });
      } else {
        setPicked(null);
        setIndex((i) => i + 1);
      }
    }, 900);
  }

  return (
    <ThemedStage theme={theme}>
      <div className="mb-4 flex items-center justify-between text-sm" style={{ color: theme.subtext }}>
        <span>
          {index + 1} / {items.length}
        </span>
        <span>✅ {correct}</span>
      </div>

      <div
        className="rounded-xl border p-5 text-lg leading-relaxed"
        style={{ background: theme.panel, borderColor: "rgba(255,255,255,0.16)", color: theme.text }}
      >
        {parts[0]}
        <span
          className="mx-1 inline-flex min-w-24 justify-center rounded-md border-b-2 px-2 py-0.5 font-semibold"
          style={{
            borderColor: picked ? "var(--color-sage)" : "var(--color-butter)",
            color: picked ? "var(--color-sage-deep)" : "var(--color-butter-deep)",
            background: picked ? "var(--color-sage-soft)" : "var(--color-butter-soft)",
          }}
        >
          {picked ? item.answer : "?"}
        </span>
        {parts[1] ?? ""}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const isAnswer = opt.trim().toLowerCase() === item.answer.trim().toLowerCase();
          const showState = picked !== null;
          const isPicked = picked === opt;
          return (
            <button
              key={opt}
              onClick={() => pick(opt)}
              disabled={picked !== null}
              className={cn(
                "rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
              )}
              style={{
                background: showState && isAnswer
                  ? "var(--color-sage-soft)"
                  : showState && isPicked
                    ? "var(--color-blush-soft)"
                    : "var(--color-lavender-soft)",
                borderColor: showState && isAnswer
                  ? "var(--color-sage)"
                  : showState && isPicked
                    ? "var(--color-blush)"
                    : "var(--color-lavender)",
                color: showState && isAnswer
                  ? "var(--color-sage-deep)"
                  : showState && isPicked
                    ? "var(--color-blush-deep)"
                    : "var(--color-lavender-deep)",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </ThemedStage>
  );
}
