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
  type LucideIcon,
} from "lucide-react";

// Maps a badge's stored icon name (see badges seed) to a lucide icon.
export const BADGE_ICONS: Record<string, LucideIcon> = {
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

export function badgeIcon(name: string): LucideIcon {
  return BADGE_ICONS[name] ?? Award;
}
