export type EventColor = "lavender" | "blush" | "sage" | "butter";

// A unified calendar event: either a manual one (stored, deletable) or an
// auto one synthesized from a test date / study-plan node / group session.
export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string | null;
  color: EventColor;
  type: "manual" | "auto";
  source?: "test" | "plan" | "session";
  description?: string | null;
}

export interface TodoItem {
  id: string;
  title: string;
  due_date: string | null;
  priority: "low" | "medium" | "high";
  project_id: string | null;
  completed: boolean;
}

export interface ProjectRef {
  id: string;
  name: string;
  color: EventColor;
}

export const COLOR_BG: Record<EventColor, string> = {
  lavender: "var(--color-lavender)",
  blush: "var(--color-blush)",
  sage: "var(--color-sage)",
  butter: "var(--color-butter)",
};
export const COLOR_SOFT: Record<EventColor, string> = {
  lavender: "var(--color-lavender-soft)",
  blush: "var(--color-blush-soft)",
  sage: "var(--color-sage-soft)",
  butter: "var(--color-butter-soft)",
};
export const COLOR_DEEP: Record<EventColor, string> = {
  lavender: "var(--color-lavender-deep)",
  blush: "var(--color-blush-deep)",
  sage: "var(--color-sage-deep)",
  butter: "var(--color-butter-deep)",
};
