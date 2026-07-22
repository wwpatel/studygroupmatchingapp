// Structured content shapes for the four Arcade game types. Gemini generates
// one of these (matched to the game type) from a topic or course material.

export type GameType = "match_up" | "term_blaster" | "sort_it" | "fill_gap";

// Match Up — term/definition pairs for a memory/concentration grid.
export interface MatchUpPair {
  term: string;
  definition: string;
}
export interface MatchUpContent {
  pairs: MatchUpPair[];
}

// Term Blaster — a question with 4 options, correct index; answers float down.
export interface TermBlasterQuestion {
  question: string;
  options: string[]; // exactly 4
  correctIndex: number; // 0-3
}
export interface TermBlasterContent {
  questions: TermBlasterQuestion[];
}

// Sort It — items dragged into the right category bucket.
export interface SortItItem {
  term: string;
  category: string;
}
export interface SortItContent {
  categories: string[]; // 3-4
  items: SortItItem[];
}

// Fill the Gap — a sentence with one blank, its answer, plus distractor options.
export interface FillGapItem {
  sentence: string; // contains "____" where the answer goes
  answer: string;
  options: string[]; // 4 options incl. the answer
}
export interface FillGapContent {
  items: FillGapItem[];
}

export type ArcadeContent =
  | MatchUpContent
  | TermBlasterContent
  | SortItContent
  | FillGapContent;

export const GAME_META: Record<
  GameType,
  { label: string; tagline: string; icon: string }
> = {
  match_up: {
    label: "Match Up",
    tagline: "Flip cards to match terms with their definitions.",
    icon: "layout-grid",
  },
  term_blaster: {
    label: "Term Blaster",
    tagline: "Click the right answer before it drifts off screen.",
    icon: "zap",
  },
  sort_it: {
    label: "Sort It",
    tagline: "Drag each term into the correct category.",
    icon: "columns-3",
  },
  fill_gap: {
    label: "Fill the Gap",
    tagline: "Complete the sentence with the missing term.",
    icon: "pencil-line",
  },
};

// Visual themes: a color scheme + background applied to the game container.
// `bg` is a CSS background value; text/accent stay legible on top of it.
export interface ArcadeTheme {
  id: string;
  label: string;
  bg: string;
  panel: string; // card/panel surface within the themed container
  text: string; // primary text on the themed background
  subtext: string;
  emoji: string;
}

export const ARCADE_THEMES: ArcadeTheme[] = [
  {
    id: "retro",
    label: "Retro Arcade",
    bg: "radial-gradient(circle at 20% 20%, #3a1c71, #4a1e6b 40%, #1a0b2e 100%)",
    panel: "rgba(255,255,255,0.08)",
    text: "#ffe29a",
    subtext: "#ffc2d1",
    emoji: "👾",
  },
  {
    id: "space",
    label: "Space",
    bg: "radial-gradient(circle at 70% 15%, #1b2a4a, #0b1023 55%, #05060f 100%)",
    panel: "rgba(184,184,255,0.10)",
    text: "#e8ecff",
    subtext: "#b8b8ff",
    emoji: "🚀",
  },
  {
    id: "cyberpunk",
    label: "Neon Cyberpunk",
    bg: "linear-gradient(135deg, #12002e, #2b0a4d 50%, #06000f 100%)",
    panel: "rgba(255,194,209,0.10)",
    text: "#ffd6e8",
    subtext: "#b8b8ff",
    emoji: "🌆",
  },
  {
    id: "ocean",
    label: "Ocean",
    bg: "linear-gradient(160deg, #063b4a, #0a5566 55%, #032430 100%)",
    panel: "rgba(169,214,184,0.12)",
    text: "#e6fbff",
    subtext: "#a9d6b8",
    emoji: "🌊",
  },
  {
    id: "forest",
    label: "Forest",
    bg: "linear-gradient(160deg, #14351f, #1d4a2b 55%, #0a1f12 100%)",
    panel: "rgba(255,226,154,0.10)",
    text: "#eafbe8",
    subtext: "#a9d6b8",
    emoji: "🌲",
  },
  {
    id: "minimal",
    label: "Minimal Clean",
    bg: "var(--color-paper-raised)",
    panel: "var(--color-paper)",
    text: "var(--color-ink)",
    subtext: "var(--color-ink-soft)",
    emoji: "⚪",
  },
];

export function themeById(id: string): ArcadeTheme {
  return ARCADE_THEMES.find((t) => t.id === id) ?? ARCADE_THEMES[ARCADE_THEMES.length - 1];
}
