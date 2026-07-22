// Single source of truth for all gamification tuning: XP values, the daily
// goal default, the level curve, and badge tier → accent color mapping.
// Badge definitions themselves live in the `badges` table (seeded by
// supabase/migration-expansion.sql) so the catalog can grow without deploys.

export const XP_VALUES = {
  quiz_completed: 20,
  test_completed: 40,
  flashcards_reviewed: 15,
  arcade_game_played: 15,
  study_plan_node_completed: 25,
  group_session_checkin: 30,
  todo_completed: 5,
  chat_study_session: 10,
} as const;

export type XpSource = keyof typeof XP_VALUES;

// Sources that should only award XP once per day (per source_id where given):
// re-reviewing the same flashcard deck or hitting the chat threshold twice in
// one day shouldn't farm XP.
export const DAILY_DEDUPED_SOURCES: XpSource[] = [
  "flashcards_reviewed",
  "chat_study_session",
];

export const DEFAULT_DAILY_XP_GOAL = 50;

// How many on-topic chat messages in a day count as a "study session".
export const CHAT_SESSION_MESSAGE_THRESHOLD = 5;

// Level curve: level n starts at 50·n·(n−1) total XP.
// L1: 0–100, L2: 100–300, L3: 300–600, L4: 600–1000, …
export function xpThresholdForLevel(level: number): number {
  return 50 * level * (level - 1);
}

export function levelForXp(totalXp: number): number {
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= totalXp) level++;
  return level;
}

/** Progress within the current level, for progress bars: 0..1 */
export function levelProgress(totalXp: number): {
  level: number;
  intoLevel: number;
  levelSpan: number;
} {
  const level = levelForXp(totalXp);
  const floor = xpThresholdForLevel(level);
  const ceil = xpThresholdForLevel(level + 1);
  return { level, intoLevel: totalXp - floor, levelSpan: ceil - floor };
}

// Badge tiers map to accent colors: tier 1 = butter, 2 = sage, 3 = lavender.
export const BADGE_TIER_TONE: Record<number, "butter" | "sage" | "lavender"> = {
  1: "butter",
  2: "sage",
  3: "lavender",
};

// Streak freeze: one freeze per rolling 7 days. A freeze lets a single fully
// missed day not break the streak.
export const FREEZE_COOLDOWN_DAYS = 7;
