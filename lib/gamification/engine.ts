import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  XP_VALUES,
  DAILY_DEDUPED_SOURCES,
  FREEZE_COOLDOWN_DAYS,
  type XpSource,
} from "./constants";

type TypedClient = SupabaseClient<Database>;

export interface UnlockedBadge {
  id: string;
  name: string;
  description: string;
  category: "streak" | "activity" | "mastery";
  tier: number;
  icon: string;
  xp_bonus: number;
}

export interface EngagementResult {
  xpAwarded: number;
  streak: { current: number; longest: number; extendedToday: boolean };
  newBadges: UnlockedBadge[];
}

/** Local date as YYYY-MM-DD (server timezone). */
function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

/**
 * The single entry point every feature calls when a student does something
 * meaningful. Awards XP, keeps the streak/freeze state, bumps lifetime XP,
 * and unlocks any streak/activity badges that crossed their threshold.
 * Never throws — gamification must not break the feature that triggered it.
 */
export async function recordEngagement(
  supabase: TypedClient,
  studentId: string,
  source: XpSource,
  sourceId?: string | null,
): Promise<EngagementResult> {
  const empty: EngagementResult = {
    xpAwarded: 0,
    streak: { current: 0, longest: 0, extendedToday: false },
    newBadges: [],
  };
  try {
    const amount = XP_VALUES[source];
    const today = dateKey();

    // Daily dedupe for farm-able sources.
    if (DAILY_DEDUPED_SOURCES.includes(source)) {
      let q = supabase
        .from("xp_log")
        .select("id")
        .eq("student_id", studentId)
        .eq("source_type", source)
        .gte("earned_at", `${today}T00:00:00`)
        .limit(1);
      if (sourceId) q = q.eq("source_id", sourceId);
      const { data: existing } = await q;
      if (existing && existing.length > 0) {
        const streak = await readStreak(supabase, studentId);
        return { ...empty, streak };
      }
    }

    await supabase.from("xp_log").insert({
      student_id: studentId,
      amount,
      source_type: source,
      source_id: sourceId ?? null,
    });

    const streak = await updateStreak(supabase, studentId, today);

    let bonusXp = 0;
    const newBadges: UnlockedBadge[] = [];

    // Streak badges whenever the streak moved today.
    if (streak.extendedToday) {
      const unlocked = await checkBadges(supabase, studentId, (cond) =>
        cond.type === "streak" ? streak.current >= (cond.days as number) : false,
      );
      newBadges.push(...unlocked);
    }

    // Activity-count badges for the metric this source feeds.
    const metric = METRIC_FOR_SOURCE[source];
    if (metric) {
      const count = await countMetric(supabase, studentId, metric);
      const unlocked = await checkBadges(supabase, studentId, (cond) =>
        cond.type === "count" && cond.metric === metric
          ? count >= (cond.n as number)
          : false,
      );
      newBadges.push(...unlocked);
    }

    bonusXp = newBadges.reduce((s, b) => s + b.xp_bonus, 0);
    if (bonusXp > 0) {
      await supabase.from("xp_log").insert(
        newBadges
          .filter((b) => b.xp_bonus > 0)
          .map((b) => ({
            student_id: studentId,
            amount: b.xp_bonus,
            source_type: "badge_bonus",
            source_id: null,
          })),
      );
    }

    // Lifetime XP on the students row (readable by groupmates → public level).
    const { data: student } = await supabase
      .from("students")
      .select("total_xp")
      .eq("id", studentId)
      .single();
    await supabase
      .from("students")
      .update({ total_xp: (student?.total_xp ?? 0) + amount + bonusXp })
      .eq("id", studentId);

    return { xpAwarded: amount + bonusXp, streak, newBadges };
  } catch (err) {
    console.error("[gamification] recordEngagement failed (ignored):", err);
    return empty;
  }
}

const METRIC_FOR_SOURCE: Partial<Record<XpSource, string>> = {
  quiz_completed: "quizzes",
  test_completed: "quizzes",
  arcade_game_played: "games",
  group_session_checkin: "checkins",
  todo_completed: "todos",
};

async function countMetric(
  supabase: TypedClient,
  studentId: string,
  metric: string,
): Promise<number> {
  switch (metric) {
    case "quizzes": {
      const { count } = await supabase
        .from("attempts")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId);
      return count ?? 0;
    }
    case "games": {
      const { count } = await supabase
        .from("arcade_attempts")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId);
      return count ?? 0;
    }
    case "materials": {
      const { count } = await supabase
        .from("materials")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId);
      return count ?? 0;
    }
    case "checkins": {
      const { count } = await supabase
        .from("checkins")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId);
      return count ?? 0;
    }
    case "todos": {
      const { count } = await supabase
        .from("todos")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentId)
        .eq("completed", true);
      return count ?? 0;
    }
    default:
      return 0;
  }
}

async function readStreak(supabase: TypedClient, studentId: string) {
  const { data } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak")
    .eq("student_id", studentId)
    .maybeSingle();
  return {
    current: data?.current_streak ?? 0,
    longest: data?.longest_streak ?? 0,
    extendedToday: false,
  };
}

/**
 * Streak rules: +1 for the first engagement of each consecutive day; a single
 * fully-missed day can be bridged by a streak freeze (max one per rolling
 * FREEZE_COOLDOWN_DAYS window); a longer gap resets to 1.
 */
async function updateStreak(supabase: TypedClient, studentId: string, today: string) {
  const { data: row } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, last_active_date, last_freeze_date")
    .eq("student_id", studentId)
    .maybeSingle();

  if (!row) {
    await supabase.from("streaks").insert({
      student_id: studentId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
    });
    return { current: 1, longest: 1, extendedToday: true };
  }

  if (row.last_active_date === today) {
    return {
      current: row.current_streak,
      longest: row.longest_streak,
      extendedToday: false,
    };
  }

  const gap = row.last_active_date ? daysBetween(row.last_active_date, today) : Infinity;
  let current: number;
  let lastFreeze = row.last_freeze_date;

  if (gap === 1) {
    current = row.current_streak + 1;
  } else if (gap === 2 && freezeAvailable(row.last_freeze_date, today)) {
    // One fully-missed day, freeze available → bridge it.
    current = row.current_streak + 1;
    lastFreeze = today;
  } else {
    current = 1;
  }

  const longest = Math.max(current, row.longest_streak);
  await supabase
    .from("streaks")
    .update({
      current_streak: current,
      longest_streak: longest,
      last_active_date: today,
      last_freeze_date: lastFreeze,
    })
    .eq("student_id", studentId);

  return { current, longest, extendedToday: true };
}

export function freezeAvailable(lastFreezeDate: string | null, today = dateKey()): boolean {
  if (!lastFreezeDate) return true;
  return daysBetween(lastFreezeDate, today) >= FREEZE_COOLDOWN_DAYS;
}

/**
 * Evaluate not-yet-unlocked badges against a predicate over their
 * unlock_condition JSON; insert unlocks and return the newly won badges.
 */
async function checkBadges(
  supabase: TypedClient,
  studentId: string,
  matches: (condition: Record<string, unknown>) => boolean,
): Promise<UnlockedBadge[]> {
  const [{ data: allBadges }, { data: owned }] = await Promise.all([
    supabase.from("badges").select("id, name, description, category, tier, icon, xp_bonus, unlock_condition"),
    supabase.from("student_badges").select("badge_id").eq("student_id", studentId),
  ]);
  const ownedIds = new Set((owned ?? []).map((b) => b.badge_id));
  const newlyUnlocked: UnlockedBadge[] = [];

  for (const badge of allBadges ?? []) {
    if (ownedIds.has(badge.id)) continue;
    const cond = badge.unlock_condition as Record<string, unknown>;
    if (!matches(cond)) continue;
    const { error } = await supabase
      .from("student_badges")
      .insert({ student_id: studentId, badge_id: badge.id });
    if (!error) {
      newlyUnlocked.push({
        id: badge.id,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        tier: badge.tier,
        icon: badge.icon,
        xp_bonus: badge.xp_bonus,
      });
    }
  }
  return newlyUnlocked;
}

/**
 * Activity badge check for metrics that aren't XP events (e.g. material
 * uploads → Bookworm). Called from the relevant route after the action.
 */
export async function checkMetricBadges(
  supabase: TypedClient,
  studentId: string,
  metric: "materials",
): Promise<UnlockedBadge[]> {
  try {
    const count = await countMetric(supabase, studentId, metric);
    const unlocked = await checkBadges(supabase, studentId, (cond) =>
      cond.type === "count" && cond.metric === metric ? count >= (cond.n as number) : false,
    );
    await applyBadgeBonuses(supabase, studentId, unlocked);
    return unlocked;
  } catch (err) {
    console.error("[gamification] checkMetricBadges failed (ignored):", err);
    return [];
  }
}

/**
 * Mastery badge checks, called from the skill-profile update path with the
 * scores it just wrote. `subjectScores` is every topic score in the subject
 * after the update (for Subject Expert).
 */
export async function checkMasteryBadges(
  supabase: TypedClient,
  studentId: string,
  updates: { newScore: number; lowestEver: number }[],
  subjectScores: number[],
): Promise<UnlockedBadge[]> {
  try {
    const unlocked = await checkBadges(supabase, studentId, (cond) => {
      if (cond.type === "mastery_any") {
        return updates.some((u) => u.newScore >= (cond.score as number));
      }
      if (cond.type === "mastery_comeback") {
        return updates.some(
          (u) => u.lowestEver < (cond.from as number) && u.newScore > (cond.to as number),
        );
      }
      if (cond.type === "mastery_subject") {
        return (
          subjectScores.length >= 3 &&
          subjectScores.every((s) => s >= (cond.score as number))
        );
      }
      return false;
    });
    await applyBadgeBonuses(supabase, studentId, unlocked);
    return unlocked;
  } catch (err) {
    console.error("[gamification] checkMasteryBadges failed (ignored):", err);
    return [];
  }
}

async function applyBadgeBonuses(
  supabase: TypedClient,
  studentId: string,
  badges: UnlockedBadge[],
) {
  const bonus = badges.reduce((s, b) => s + b.xp_bonus, 0);
  if (bonus === 0) return;
  await supabase.from("xp_log").insert(
    badges
      .filter((b) => b.xp_bonus > 0)
      .map((b) => ({
        student_id: studentId,
        amount: b.xp_bonus,
        source_type: "badge_bonus",
        source_id: null,
      })),
  );
  const { data: student } = await supabase
    .from("students")
    .select("total_xp")
    .eq("id", studentId)
    .single();
  await supabase
    .from("students")
    .update({ total_xp: (student?.total_xp ?? 0) + bonus })
    .eq("id", studentId);
}

/** Today's XP total, for the sidebar counter / daily-goal ring. */
export async function getTodayXp(supabase: TypedClient, studentId: string): Promise<number> {
  const { data } = await supabase
    .from("xp_log")
    .select("amount")
    .eq("student_id", studentId)
    .gte("earned_at", `${dateKey()}T00:00:00`);
  return (data ?? []).reduce((s, r) => s + r.amount, 0);
}
