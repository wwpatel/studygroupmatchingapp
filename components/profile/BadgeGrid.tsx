"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { badgeIcon } from "@/components/gamification/badgeIcons";
import { BADGE_TIER_TONE } from "@/lib/gamification/constants";
import { Lock, X, Zap } from "lucide-react";

export interface BadgeRow {
  id: string;
  name: string;
  description: string;
  tier: number;
  icon: string;
  xp_bonus: number;
  unlockedAt: string | null; // null = locked
}

const TONE_SOFT: Record<string, string> = {
  lavender: "var(--color-lavender-soft)",
  sage: "var(--color-sage-soft)",
  butter: "var(--color-butter-soft)",
};
const TONE_DEEP: Record<string, string> = {
  lavender: "var(--color-lavender-deep)",
  sage: "var(--color-sage-deep)",
  butter: "var(--color-butter-deep)",
};

export function BadgeGrid({ badges }: { badges: BadgeRow[] }) {
  const [selected, setSelected] = useState<BadgeRow | null>(null);
  const earned = badges.filter((b) => b.unlockedAt);
  const locked = badges.filter((b) => !b.unlockedAt);
  const ordered = [...earned, ...locked];

  return (
    <div>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {ordered.map((b) => {
          const Icon = badgeIcon(b.icon);
          const tone = BADGE_TIER_TONE[b.tier] ?? "butter";
          const isEarned = !!b.unlockedAt;
          return (
            <button
              key={b.id}
              onClick={() => setSelected(b)}
              className="flex flex-col items-center gap-1.5"
              title={b.name}
            >
              <div
                className={cn(
                  "flex size-14 items-center justify-center rounded-full border-2 transition-transform hover:scale-105",
                  !isEarned && "grayscale",
                )}
                style={{
                  background: isEarned ? TONE_SOFT[tone] : "var(--color-line-soft)",
                  borderColor: isEarned ? TONE_DEEP[tone] : "var(--color-line)",
                  opacity: isEarned ? 1 : 0.55,
                }}
              >
                {isEarned ? (
                  <Icon className="size-6" style={{ color: TONE_DEEP[tone] }} strokeWidth={1.9} />
                ) : (
                  <Lock className="size-5 text-ink-faint" />
                )}
              </div>
              <span
                className={cn(
                  "line-clamp-1 text-center text-[10px] font-medium",
                  isEarned ? "text-ink" : "text-ink-faint",
                )}
              >
                {b.name}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl border border-line bg-paper-raised p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelected(null)}
              className="ml-auto flex text-ink-faint hover:text-ink"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
            {(() => {
              const Icon = badgeIcon(selected.icon);
              const tone = BADGE_TIER_TONE[selected.tier] ?? "butter";
              const isEarned = !!selected.unlockedAt;
              return (
                <>
                  <div
                    className={cn(
                      "mx-auto flex size-20 items-center justify-center rounded-full border-2",
                      !isEarned && "grayscale",
                    )}
                    style={{
                      background: isEarned ? TONE_SOFT[tone] : "var(--color-line-soft)",
                      borderColor: isEarned ? TONE_DEEP[tone] : "var(--color-line)",
                      opacity: isEarned ? 1 : 0.6,
                    }}
                  >
                    {isEarned ? (
                      <Icon className="size-9" style={{ color: TONE_DEEP[tone] }} strokeWidth={1.75} />
                    ) : (
                      <Lock className="size-7 text-ink-faint" />
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ink">{selected.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{selected.description}</p>
                  {selected.xp_bonus > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-lavender-soft px-2.5 py-0.5 text-xs font-semibold text-lavender-deep">
                      <Zap className="size-3" />+{selected.xp_bonus} XP
                    </p>
                  )}
                  <p className="mt-3 text-xs text-ink-faint">
                    {isEarned
                      ? `Earned ${new Date(selected.unlockedAt!).toLocaleDateString()}`
                      : "Locked — keep studying to unlock"}
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
