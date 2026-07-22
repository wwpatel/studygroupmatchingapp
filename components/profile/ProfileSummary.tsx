import { Flame, Trophy, Zap } from "lucide-react";
import { levelProgress } from "@/lib/gamification/constants";

// Streak + level + XP summary — shared by own and public profile views.
export function ProfileSummary({
  currentStreak,
  longestStreak,
  totalXp,
}: {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
}) {
  const { level, intoLevel, levelSpan } = levelProgress(totalXp);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* Streak */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-butter-soft">
            <Flame className="size-6 text-butter-deep" />
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-none text-ink">{currentStreak}</p>
            <p className="text-xs text-ink-soft">day streak</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-faint">Longest: {longestStreak} days</p>
      </div>

      {/* Level */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-sage-soft">
            <Trophy className="size-6 text-sage-deep" />
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-none text-ink">{level}</p>
            <p className="text-xs text-ink-soft">level</p>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
          <div
            className="h-full rounded-full bg-sage"
            style={{ width: `${Math.round((intoLevel / levelSpan) * 100)}%` }}
          />
        </div>
      </div>

      {/* Total XP */}
      <div className="rounded-2xl border border-line bg-paper-raised p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-lavender-soft">
            <Zap className="size-6 text-lavender-deep" />
          </div>
          <div>
            <p className="font-display text-3xl font-bold leading-none text-ink">{totalXp}</p>
            <p className="text-xs text-ink-soft">total XP</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          {levelSpan - intoLevel} XP to level {level + 1}
        </p>
      </div>
    </div>
  );
}
