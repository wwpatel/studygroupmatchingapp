import { Card, CardBody } from "@/components/ui/Card";
import { Flame, Zap, Trophy } from "lucide-react";
import { levelProgress } from "@/lib/gamification/constants";

/** SVG progress ring for the daily XP goal. */
function GoalRing({ value, goal }: { value: number; goal: number }) {
  const pct = Math.max(0, Math.min(1, goal > 0 ? value / goal : 0));
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-20">
      <svg viewBox="0 0 72 72" className="size-20 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-line-soft" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="stroke-lavender transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-ink">{value}</span>
        <span className="text-[10px] text-ink-faint">/ {goal} XP</span>
      </div>
    </div>
  );
}

export function DailyGoalCard({
  todayXp,
  dailyGoal,
  currentStreak,
  longestStreak,
  totalXp,
}: {
  todayXp: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
}) {
  const { level, intoLevel, levelSpan } = levelProgress(totalXp);
  const goalMet = todayXp >= dailyGoal;

  return (
    <Card>
      <CardBody className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-4">
          <GoalRing value={todayXp} goal={dailyGoal} />
          <div>
            <p className="text-sm font-semibold text-ink">Daily goal</p>
            <p className="text-xs text-ink-soft">
              {goalMet ? "Goal reached — nice work!" : `${Math.max(0, dailyGoal - todayXp)} XP to go today`}
            </p>
          </div>
        </div>

        <div className="h-10 w-px bg-line max-sm:hidden" />

        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-butter-soft">
            <Flame className="size-5 text-butter-deep" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold leading-none text-ink">
              {currentStreak} day{currentStreak === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-xs text-ink-soft">streak · best {longestStreak}</p>
          </div>
        </div>

        <div className="h-10 w-px bg-line max-sm:hidden" />

        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-sage-soft">
            <Trophy className="size-5 text-sage-deep" />
          </div>
          <div className="min-w-32">
            <p className="font-display text-xl font-semibold leading-none text-ink">
              Level {level}
            </p>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
              <div
                className="h-full rounded-full bg-sage"
                style={{ width: `${Math.round((intoLevel / levelSpan) * 100)}%` }}
              />
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
              <Zap className="size-3" />
              {totalXp} XP total
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
