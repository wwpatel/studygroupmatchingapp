"use client";

import { useEffect, useRef, useState } from "react";
import type { ArcadeTheme, TermBlasterContent } from "@/lib/types/arcade";
import type { GameResult } from "../shared";
import { ThemedStage } from "../shared";

// A question sits at the top; its 4 options drift down from the top of the
// board. Click the correct one before it (or the timer) runs out. Speed ramps
// up each question. Tracks score and best correct streak.
export function TermBlaster({
  theme,
  content,
  onComplete,
}: {
  theme: ArcadeTheme;
  content: TermBlasterContent;
  onComplete: (r: GameResult) => void;
}) {
  const questions = content.questions.slice(0, 8);
  const startRef = useRef(Date.now());
  const [qIndex, setQIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [progress, setProgress] = useState(0); // 0..1 fall progress
  const [flash, setFlash] = useState<{ index: number; ok: boolean } | null>(null);
  const rafRef = useRef<number>(0);
  const answeredRef = useRef(false);

  const q = questions[qIndex];
  // Falls speed up as you progress.
  const fallDurationMs = Math.max(3200, 6000 - qIndex * 350);

  useEffect(() => {
    answeredRef.current = false;
    setProgress(0);
    setFlash(null);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / fallDurationMs);
      setProgress(p);
      if (p >= 1) {
        if (!answeredRef.current) handleAnswer(-1); // timed out
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  function handleAnswer(optionIndex: number) {
    if (answeredRef.current) return;
    answeredRef.current = true;
    cancelAnimationFrame(rafRef.current);

    const isCorrect = optionIndex === q.correctIndex;
    if (isCorrect) {
      setCorrect((c) => c + 1);
      setStreak((s) => {
        const ns = s + 1;
        setBestStreak((b) => Math.max(b, ns));
        return ns;
      });
      setFlash({ index: optionIndex, ok: true });
    } else {
      setStreak(0);
      setMissed((m) => [...m, `${q.question} → ${q.options[q.correctIndex]}`]);
      setFlash({ index: optionIndex, ok: false });
    }

    setTimeout(() => {
      if (qIndex + 1 >= questions.length) {
        const duration = Math.round((Date.now() - startRef.current) / 1000);
        const finalCorrect = correct + (isCorrect ? 1 : 0);
        onComplete({
          score: finalCorrect * 100 + bestStreak * 25,
          accuracy: Math.round((finalCorrect / questions.length) * 100),
          durationSeconds: duration,
          missed: isCorrect ? missed : [...missed, `${q.question} → ${q.options[q.correctIndex]}`],
          extra: { "Best streak": Math.max(bestStreak, isCorrect ? streak + 1 : 0) },
        });
      } else {
        setQIndex((i) => i + 1);
      }
    }, 650);
  }

  // Four non-overlapping columns; options share the same vertical fall.
  const laneLeft = (i: number) => 1.5 + i * 24.75; // % left edge

  return (
    <ThemedStage theme={theme} style={{ minHeight: 460 }}>
      <div className="flex items-center justify-between text-sm" style={{ color: theme.subtext }}>
        <span>
          Question {qIndex + 1} / {questions.length}
        </span>
        <span>🔥 {streak}</span>
      </div>

      <div
        className="mx-auto mt-3 max-w-lg rounded-xl border px-4 py-3 text-center font-display text-base font-semibold sm:text-lg"
        style={{ background: theme.panel, borderColor: "rgba(255,255,255,0.16)", color: theme.text }}
      >
        {q.question}
      </div>

      <div className="relative mt-4 h-72 overflow-hidden rounded-xl" style={{ background: "rgba(0,0,0,0.15)" }}>
        {q.options.map((opt, i) => {
          const isFlash = flash?.index === i;
          const top = `calc(${progress * 78}% )`;
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="absolute w-[22%] break-words rounded-lg border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight shadow-md transition-colors sm:text-xs"
              style={{
                left: `${laneLeft(i)}%`,
                top,
                background: isFlash
                  ? flash!.ok
                    ? "var(--color-sage)"
                    : "var(--color-blush)"
                  : "var(--color-lavender-soft)",
                borderColor: isFlash
                  ? flash!.ok
                    ? "var(--color-sage-deep)"
                    : "var(--color-blush-deep)"
                  : "var(--color-lavender)",
                color: isFlash ? "#000" : "var(--color-lavender-deep)",
              }}
            >
              {opt}
            </button>
          );
        })}
        {/* Danger line at the bottom */}
        <div
          className="absolute inset-x-0 bottom-4 h-0.5"
          style={{ background: "var(--color-blush)", opacity: 0.5 }}
        />
      </div>
      <p className="mt-2 text-center text-xs" style={{ color: theme.subtext }}>
        Click the correct answer before it reaches the line.
      </p>
    </ThemedStage>
  );
}
