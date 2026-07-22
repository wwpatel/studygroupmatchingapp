"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  GameType,
  ArcadeContent,
  MatchUpContent,
  TermBlasterContent,
  SortItContent,
  FillGapContent,
} from "@/lib/types/arcade";
import { themeById, GAME_META } from "@/lib/types/arcade";
import { celebrate } from "@/components/gamification/Celebration";
import { MatchUp } from "./games/MatchUp";
import { TermBlaster } from "./games/TermBlaster";
import { SortIt } from "./games/SortIt";
import { FillTheGap } from "./games/FillTheGap";
import { GameResults } from "./GameResults";
import type { GameResult } from "./shared";
import { ArrowLeft } from "lucide-react";

export function GamePlayer({
  gameId,
  gameType,
  theme: themeId,
  topic,
  content,
}: {
  gameId: string;
  gameType: GameType;
  theme: string;
  topic: string;
  content: ArcadeContent;
}) {
  const theme = themeById(themeId);
  const [result, setResult] = useState<GameResult | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);
  const [round, setRound] = useState(0); // remount key to replay

  async function handleComplete(r: GameResult) {
    setResult(r);
    try {
      const res = await fetch("/api/arcade/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId,
          score: r.score,
          accuracy: r.accuracy,
          durationSeconds: r.durationSeconds,
          details: { missed: r.missed },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setXpAwarded(data.xpAwarded ?? 0);
        celebrate({ xpAwarded: data.xpAwarded, newBadges: data.newBadges });
      }
    } catch {
      // Attempt-save failure shouldn't block the results screen.
    }
  }

  function playAgain() {
    setResult(null);
    setXpAwarded(null);
    setRound((r) => r + 1);
  }

  const game = (() => {
    switch (gameType) {
      case "match_up":
        return <MatchUp key={round} theme={theme} content={content as MatchUpContent} onComplete={handleComplete} />;
      case "term_blaster":
        return <TermBlaster key={round} theme={theme} content={content as TermBlasterContent} onComplete={handleComplete} />;
      case "sort_it":
        return <SortIt key={round} theme={theme} content={content as SortItContent} onComplete={handleComplete} />;
      case "fill_gap":
        return <FillTheGap key={round} theme={theme} content={content as FillGapContent} onComplete={handleComplete} />;
    }
  })();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-10">
      <Link href="/arcade" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Arcade
      </Link>
      <div className="mt-2 mb-6 flex items-center gap-2">
        <span className="text-xl">{theme.emoji}</span>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          {GAME_META[gameType].label} · {topic}
        </h1>
      </div>
      {result ? (
        <GameResults theme={theme} result={result} xpAwarded={xpAwarded} onPlayAgain={playAgain} />
      ) : (
        game
      )}
    </div>
  );
}
