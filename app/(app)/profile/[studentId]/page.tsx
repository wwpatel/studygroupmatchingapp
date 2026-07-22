import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ProfileSummary } from "@/components/profile/ProfileSummary";
import { BadgeGrid } from "@/components/profile/BadgeGrid";
import { loadBadges } from "@/lib/profile";
import { ArrowLeft } from "lucide-react";

// Public profile of a groupmate: name, avatar, streak, level, badges only —
// no study stats or activity. RLS on students/streaks/student_badges already
// restricts reads to self-or-groupmate, so a non-groupmate sees nothing.
export default async function PublicProfilePage({ params }: { params: { studentId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (params.studentId === user.id) redirect("/profile");

  const { data: student } = await supabase
    .from("students")
    .select("id, name, avatar, total_xp")
    .eq("id", params.studentId)
    .maybeSingle();

  // RLS returns no row if this student isn't the viewer or a groupmate.
  if (!student) notFound();

  const { data: streak } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak")
    .eq("student_id", student.id)
    .maybeSingle();

  const badges = (await loadBadges(supabase, student.id)).filter((b) => b.unlockedAt);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:py-10">
      <Link href="/groups" className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="mt-4 flex flex-col items-center text-center sm:flex-row sm:text-left">
        <div className="flex size-20 items-center justify-center rounded-full bg-lavender-soft text-4xl">
          {student.avatar ?? "🦊"}
        </div>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:ml-5 sm:mt-0">
          {student.name}
        </h1>
      </div>

      <div className="mt-8">
        <ProfileSummary
          currentStreak={streak?.current_streak ?? 0}
          longestStreak={streak?.longest_streak ?? 0}
          totalXp={student.total_xp ?? 0}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Badges</h2>
        {badges.length > 0 ? (
          <BadgeGrid badges={badges} />
        ) : (
          <p className="text-sm text-ink-faint">No badges earned yet.</p>
        )}
      </div>
    </div>
  );
}
