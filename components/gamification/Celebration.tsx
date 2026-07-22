"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BADGE_TIER_TONE } from "@/lib/gamification/constants";
import type { UnlockedBadge } from "@/lib/gamification/engine";
import {
  Flame,
  FlameKindling,
  FileQuestion,
  Gamepad2,
  BookOpen,
  Users2,
  ListChecks,
  Star,
  GraduationCap,
  TrendingUp,
  Award,
  Zap,
  X,
} from "lucide-react";

const BADGE_ICONS: Record<string, typeof Flame> = {
  flame: Flame,
  "flame-kindling": FlameKindling,
  "file-question": FileQuestion,
  "gamepad-2": Gamepad2,
  "book-open": BookOpen,
  "users-2": Users2,
  "list-checks": ListChecks,
  star: Star,
  "graduation-cap": GraduationCap,
  "trending-up": TrendingUp,
};

export interface CelebrationPayload {
  xpAwarded?: number;
  newBadges?: UnlockedBadge[];
}

const STORAGE_KEY = "nova-celebration";
const EVENT_NAME = "nova:celebrate";

/**
 * Queue a celebration (XP toast + badge modal). Survives a client-side
 * redirect (e.g. quiz submit → results page) via sessionStorage; same-page
 * flows are picked up immediately via a window event.
 */
export function celebrate(payload: CelebrationPayload) {
  if (!payload.xpAwarded && !(payload.newBadges && payload.newBadges.length)) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable — same-page event still works.
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

const TONE_STYLES = {
  butter: "bg-butter-soft text-butter-deep border-butter",
  sage: "bg-sage-soft text-sage-deep border-sage",
  lavender: "bg-lavender-soft text-lavender-deep border-lavender",
} as const;

export function GamificationCelebration() {
  const pathname = usePathname();
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<UnlockedBadge[]>([]);

  const consume = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      sessionStorage.removeItem(STORAGE_KEY);
      const payload = JSON.parse(raw) as CelebrationPayload;
      if (payload.xpAwarded) setXpToast(payload.xpAwarded);
      if (payload.newBadges?.length) setBadgeQueue((q) => [...q, ...payload.newBadges!]);
    } catch {
      // Ignore malformed payloads.
    }
  }, []);

  // Pick up queued celebrations on mount, after navigation, and same-page.
  useEffect(consume, [consume, pathname]);
  useEffect(() => {
    window.addEventListener(EVENT_NAME, consume);
    return () => window.removeEventListener(EVENT_NAME, consume);
  }, [consume]);

  useEffect(() => {
    if (xpToast === null) return;
    const t = setTimeout(() => setXpToast(null), 3500);
    return () => clearTimeout(t);
  }, [xpToast]);

  const badge = badgeQueue[0] ?? null;
  const tone = badge ? (BADGE_TIER_TONE[badge.tier] ?? "butter") : "butter";
  const BadgeIcon = badge ? (BADGE_ICONS[badge.icon] ?? Award) : Award;

  return (
    <>
      {/* XP toast */}
      {xpToast !== null && !badge && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-2 rounded-full border border-lavender bg-lavender-soft px-4 py-2 text-sm font-semibold text-lavender-deep shadow-lg">
            <Zap className="size-4" />+{xpToast} XP
          </div>
        </div>
      )}

      {/* Badge unlock modal */}
      {badge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-sm animate-fade-up overflow-hidden rounded-2xl border border-line bg-paper-raised p-8 text-center shadow-2xl">
            {/* Confetti dots */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {[...Array(14)].map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "absolute size-2 animate-confetti rounded-full",
                    ["bg-lavender", "bg-blush", "bg-sage", "bg-butter"][i % 4],
                  )}
                  style={{
                    left: `${6 + ((i * 6.5) % 88)}%`,
                    animationDelay: `${(i % 7) * 0.18}s`,
                  }}
                />
              ))}
            </div>

            <button
              onClick={() => setBadgeQueue((q) => q.slice(1))}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-line-soft hover:text-ink"
            >
              <X className="size-4" />
            </button>

            <p className="text-xs font-semibold uppercase tracking-widest text-ink-faint">
              Badge unlocked
            </p>
            <div
              className={cn(
                "mx-auto mt-4 flex size-20 items-center justify-center rounded-full border-2",
                TONE_STYLES[tone],
              )}
            >
              <BadgeIcon className="size-9" strokeWidth={1.75} />
            </div>
            <h2 className="mt-4 font-display text-2xl font-semibold text-ink">{badge.name}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{badge.description}</p>
            {badge.xp_bonus > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lavender-soft px-3 py-1 text-sm font-semibold text-lavender-deep">
                <Zap className="size-3.5" />+{badge.xp_bonus} XP bonus
              </p>
            )}
            <div className="mt-6">
              <button
                onClick={() => setBadgeQueue((q) => q.slice(1))}
                className="w-full rounded-xl bg-lavender px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-lavender/90"
              >
                {badgeQueue.length > 1 ? `Nice! (${badgeQueue.length - 1} more)` : "Nice!"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
