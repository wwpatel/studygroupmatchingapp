"use client";

import type { CSSProperties, ReactNode } from "react";
import type { ArcadeTheme } from "@/lib/types/arcade";

// What every game reports back when finished.
export interface GameResult {
  score: number;
  accuracy: number; // 0-100
  durationSeconds: number;
  missed: string[]; // human-readable items the student got wrong
  extra?: Record<string, number>; // e.g. flips, best streak — shown on results
}

// A game container styled with the chosen theme. Games render their board
// inside this so the theme's background/colors apply consistently.
export function ThemedStage({
  theme,
  children,
  style,
}: {
  theme: ArcadeTheme;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const isMinimal = theme.id === "minimal";
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-line p-5 sm:p-7"
      style={{
        background: theme.bg,
        color: theme.text,
        // A subtle inner glow for non-minimal themes.
        boxShadow: isMinimal ? undefined : "inset 0 0 80px rgba(0,0,0,0.25)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Theme-aware panel surface for cards/buttons inside the stage.
export function panelStyle(theme: ArcadeTheme): CSSProperties {
  return {
    background: theme.panel,
    color: theme.text,
    borderColor: theme.id === "minimal" ? "var(--color-line)" : "rgba(255,255,255,0.18)",
  };
}
