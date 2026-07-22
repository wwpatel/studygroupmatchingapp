"use client";

import Link from "next/link";
import type { ArcadeTheme } from "@/lib/types/arcade";
import type { GameResult } from "./shared";
import { ThemedStage } from "./shared";
import { Trophy, Target, Clock, RotateCw, Home, Zap } from "lucide-react";

export function GameResults({
  theme,
  result,
  xpAwarded,
  onPlayAgain,
}: {
  theme: ArcadeTheme;
  result: GameResult;
  xpAwarded: number | null;
  onPlayAgain: () => void;
}) {
  const stats: { icon: typeof Trophy; label: string; value: string }[] = [
    { icon: Trophy, label: "Score", value: String(result.score) },
    { icon: Target, label: "Accuracy", value: `${Math.round(result.accuracy)}%` },
    { icon: Clock, label: "Time", value: `${result.durationSeconds}s` },
  ];
  for (const [k, v] of Object.entries(result.extra ?? {})) {
    stats.push({ icon: Zap, label: k, value: String(v) });
  }

  return (
    <ThemedStage theme={theme}>
      <div className="mx-auto max-w-md py-4 text-center">
        <div className="text-4xl">{result.accuracy >= 80 ? "🎉" : result.accuracy >= 50 ? "👍" : "💪"}</div>
        <h2 className="mt-2 font-display text-2xl font-bold" style={{ color: theme.text }}>
          {result.accuracy >= 80 ? "Great game!" : result.accuracy >= 50 ? "Nice work!" : "Keep practicing!"}
        </h2>
        {xpAwarded !== null && xpAwarded > 0 && (
          <p
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold"
            style={{ background: "var(--color-lavender)", color: "#000" }}
          >
            <Zap className="size-3.5" />+{xpAwarded} XP
          </p>
        )}

        <div className="mt-6 grid grid-cols-3 gap-3">
          {stats.slice(0, 6).map((s) => (
            <div
              key={s.label}
              className="rounded-xl border p-3"
              style={{ background: theme.panel, borderColor: "rgba(255,255,255,0.14)" }}
            >
              <s.icon className="mx-auto size-4" style={{ color: theme.subtext }} />
              <p className="mt-1.5 font-display text-lg font-bold" style={{ color: theme.text }}>
                {s.value}
              </p>
              <p className="text-[11px]" style={{ color: theme.subtext }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {result.missed.length > 0 && (
          <div
            className="mt-5 rounded-xl border p-4 text-left"
            style={{ background: theme.panel, borderColor: "rgba(255,255,255,0.14)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.subtext }}>
              Review these
            </p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: theme.text }}>
              {result.missed.slice(0, 8).map((m, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: "var(--color-blush)" }}>•</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={onPlayAgain}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
            style={{ background: "var(--color-lavender)", color: "#000" }}
          >
            <RotateCw className="size-4" /> Play again
          </button>
          <Link
            href="/arcade"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold"
            style={{ borderColor: "rgba(255,255,255,0.25)", color: theme.text }}
          >
            <Home className="size-4" /> Arcade
          </Link>
        </div>
      </div>
    </ThemedStage>
  );
}
