import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { ProfileStats } from "@/components/profile/ProfileStats";
import { XpWeekChart } from "@/components/profile/XpWeekChart";
import { BadgeGrid } from "@/components/profile/BadgeGrid";
import { loadBadges, loadXpWeek, loadStats } from "@/lib/profile";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: student } = await supabase
    .from("students")
    .select("name, avatar, total_xp")
    .eq("id", user.id)
    .single();

  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak")
    .eq("student_id", user.id)
    .maybeSingle();

  const [badges, xpWeek, stats] = await Promise.all([
    loadBadges(supabase, user.id),
    loadXpWeek(supabase, user.id),
    loadStats(supabase, user.id),
  ]);

  const earnedCount = badges.filter((b) => b.unlockedAt).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-10">
      <ProfileHeader name={student?.name ?? "Student"} avatar={student?.avatar ?? null} editable />

      <div className="mt-8">
        <ProfileSummary
          currentStreak={streak?.current_streak ?? 0}
          longestStreak={streak?.longest_streak ?? 0}
          totalXp={student?.total_xp ?? 0}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-5">
        <h2 className="font-display text-lg font-semibold text-ink">This week</h2>
        <p className="text-sm text-ink-soft">XP earned each day</p>
        <div className="mt-4">
          <XpWeekChart days={xpWeek} />
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Study stats</h2>
        <ProfileStats
          quizzes={stats.quizzes}
          games={stats.games}
          materials={stats.materials}
          studyMinutes={stats.studyMinutes}
        />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Badges</h2>
          <span className="text-sm text-ink-faint">
            {earnedCount} / {badges.length} earned
          </span>
        </div>
        <BadgeGrid badges={badges} />
      </div>
    </div>
  );
}
