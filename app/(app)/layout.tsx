import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/Sidebar";
import { GamificationCelebration } from "@/components/gamification/Celebration";
import { getTodayXp } from "@/lib/gamification/engine";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let { data: student } = await supabase
    .from("students")
    .select("id, name, email, avatar")
    .eq("id", user.id)
    .maybeSingle();

  if (!student) {
    const { data: created } = await supabase
      .from("students")
      .insert({
        id: user.id,
        email: user.email ?? "",
        name: (user.user_metadata?.name as string | undefined) ?? user.email?.split("@")[0] ?? "Student",
      })
      .select("id, name, email, avatar")
      .single();
    student = created;
  }

  // Gamification chrome (best-effort: zeros until the expansion migration
  // has been applied to the database).
  let todayXp = 0;
  let currentStreak = 0;
  try {
    const [xp, { data: streakRow }] = await Promise.all([
      getTodayXp(supabase, user.id),
      supabase.from("streaks").select("current_streak").eq("student_id", user.id).maybeSingle(),
    ]);
    todayXp = xp;
    currentStreak = streakRow?.current_streak ?? 0;
  } catch {
    // Tables missing pre-migration — sidebar just shows zeros.
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row">
      <Sidebar
        studentName={student?.name ?? "Student"}
        studentAvatar={student?.avatar ?? null}
        todayXp={todayXp}
        currentStreak={currentStreak}
      />
      <main className="min-w-0 flex-1">{children}</main>
      <GamificationCelebration />
    </div>
  );
}
