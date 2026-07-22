import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { BadgeRow } from "@/components/profile/BadgeGrid";

type TypedClient = SupabaseClient<Database>;

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** All badges joined with this student's unlock state, earned-first. */
export async function loadBadges(supabase: TypedClient, studentId: string): Promise<BadgeRow[]> {
  const [{ data: allBadges }, { data: owned }] = await Promise.all([
    supabase
      .from("badges")
      .select("id, name, description, tier, icon, xp_bonus, category")
      .order("category", { ascending: true })
      .order("tier", { ascending: true }),
    supabase.from("student_badges").select("badge_id, unlocked_at").eq("student_id", studentId),
  ]);
  const unlockedMap = new Map((owned ?? []).map((b) => [b.badge_id, b.unlocked_at]));
  return (allBadges ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    description: b.description,
    tier: b.tier,
    icon: b.icon,
    xp_bonus: b.xp_bonus,
    unlockedAt: unlockedMap.get(b.id) ?? null,
  }));
}

/** XP earned per day for the last 7 days (oldest → today). */
export async function loadXpWeek(
  supabase: TypedClient,
  studentId: string,
): Promise<{ label: string; xp: number }[]> {
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("xp_log")
    .select("amount, earned_at")
    .eq("student_id", studentId)
    .gte("earned_at", start.toISOString());

  const byDay = new Map<string, number>();
  for (const row of data ?? []) {
    const key = dateKey(new Date(row.earned_at));
    byDay.set(key, (byDay.get(key) ?? 0) + row.amount);
  }

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const out: { label: string; xp: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    out.push({ label: DAYS[d.getDay()], xp: byDay.get(dateKey(d)) ?? 0 });
  }
  return out;
}

/** Aggregate study stats for the owner's private view. */
export async function loadStats(supabase: TypedClient, studentId: string) {
  const [quizzes, games, materials, arcadeDurations] = await Promise.all([
    supabase.from("attempts").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    supabase.from("arcade_attempts").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    supabase.from("materials").select("id", { count: "exact", head: true }).eq("student_id", studentId),
    supabase.from("arcade_attempts").select("duration_seconds").eq("student_id", studentId),
  ]);
  const arcadeSeconds = (arcadeDurations.data ?? []).reduce((s, r) => s + (r.duration_seconds ?? 0), 0);
  // Study time ≈ arcade time + a flat 3 min per quiz attempt (rough estimate).
  const studyMinutes = Math.round(arcadeSeconds / 60 + (quizzes.count ?? 0) * 3);
  return {
    quizzes: quizzes.count ?? 0,
    games: games.count ?? 0,
    materials: materials.count ?? 0,
    studyMinutes,
  };
}
