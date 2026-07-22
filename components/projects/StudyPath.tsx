"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { celebrate } from "@/components/gamification/Celebration";
import {
  FileQuestion,
  Layers,
  Gamepad2,
  MessageCircle,
  BookOpen,
  Check,
  Lock,
  Play,
  Loader2,
} from "lucide-react";

export interface PlanNode {
  id: string;
  topic: string;
  activity_type: "quiz" | "flashcards" | "game" | "chat" | "review";
  description: string;
  scheduled_date: string | null;
  status: "locked" | "current" | "completed";
  order_index: number;
}

const ACTIVITY_ICON = {
  quiz: FileQuestion,
  flashcards: Layers,
  game: Gamepad2,
  chat: MessageCircle,
  review: BookOpen,
} as const;

const ACTIVITY_LABEL = {
  quiz: "Take a quiz",
  flashcards: "Review flashcards",
  game: "Play a game",
  chat: "Ask Nova",
  review: "Review material",
} as const;

// Cycle completed-node colors through all four accents so the path is vibrant.
const COMPLETED_TONES = ["lavender", "blush", "sage", "butter"] as const;
const TONE_BG: Record<string, string> = {
  lavender: "var(--color-lavender)",
  blush: "var(--color-blush)",
  sage: "var(--color-sage)",
  butter: "var(--color-butter)",
};

// Where a node's activity sends the student. The chatbot generates quizzes and
// flashcards inline, so those route to chat; games route to the Arcade.
function activityHref(node: PlanNode): string {
  switch (node.activity_type) {
    case "game":
      return "/arcade";
    case "review":
      return "/materials";
    default:
      return `/chat?prompt=${encodeURIComponent(hint(node))}`;
  }
}

function hint(node: PlanNode): string {
  switch (node.activity_type) {
    case "quiz":
      return `Quiz me on ${node.topic}`;
    case "flashcards":
      return `Make me flashcards on ${node.topic}`;
    default:
      return `Help me study ${node.topic}`;
  }
}

export function StudyPath({ nodes }: { nodes: PlanNode[] }) {
  const router = useRouter();
  const [completing, setCompleting] = useState<string | null>(null);

  async function markDone(node: PlanNode) {
    setCompleting(node.id);
    try {
      const res = await fetch(`/api/projects/nodes/${node.id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        celebrate({ xpAwarded: data.xpAwarded, newBadges: data.newBadges });
      }
    } catch {
      // ignore
    }
    setCompleting(null);
    router.refresh();
  }

  let completedCount = 0;

  return (
    <div className="relative mx-auto max-w-xl">
      {nodes.map((node, i) => {
        const Icon = ACTIVITY_ICON[node.activity_type];
        const isCompleted = node.status === "completed";
        const isCurrent = node.status === "current";
        const isLocked = node.status === "locked";
        const tone = COMPLETED_TONES[completedCount % 4];
        if (isCompleted) completedCount++;
        // Gentle left/right zigzag.
        const offset = [0, 1, 2, 1][i % 4]; // 0..2 columns of nudge
        const align = i % 2 === 0 ? "self-start" : "self-end";

        return (
          <div key={node.id} className="relative flex flex-col">
            {/* Connector line to the previous node */}
            {i > 0 && (
              <div
                className="absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2 -translate-y-8"
                style={{ background: "var(--color-line)" }}
              />
            )}
            <div
              className={cn("flex items-center gap-4 py-4", align)}
              style={{ marginLeft: `${offset * 12}%`, marginRight: `${(2 - offset) * 0}%` }}
            >
              {/* Node circle */}
              <button
                onClick={() => !isLocked && router.push(activityHref(node))}
                disabled={isLocked}
                aria-label={`${node.topic} — ${node.status}`}
                className={cn(
                  "relative flex size-16 shrink-0 items-center justify-center rounded-full border-2 transition-transform",
                  !isLocked && "hover:scale-105",
                  isCurrent && "animate-pulse-soft",
                )}
                style={{
                  background: isCompleted
                    ? TONE_BG[tone]
                    : isCurrent
                      ? "var(--color-lavender-soft)"
                      : "var(--color-line-soft)",
                  borderColor: isCompleted
                    ? TONE_BG[tone]
                    : isCurrent
                      ? "var(--color-lavender)"
                      : "var(--color-line)",
                  boxShadow: isCurrent ? "0 0 0 6px var(--color-lavender-soft)" : undefined,
                  opacity: isLocked ? 0.6 : 1,
                }}
              >
                {isCompleted ? (
                  <Check className="size-7 text-black" strokeWidth={2.5} />
                ) : isLocked ? (
                  <Lock className="size-6 text-ink-faint" />
                ) : (
                  <Icon className="size-7 text-lavender-deep" strokeWidth={2} />
                )}
              </button>

              {/* Label */}
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-display text-base font-semibold",
                    isLocked ? "text-ink-faint" : "text-ink",
                  )}
                >
                  {node.topic}
                </p>
                <p className="text-xs text-ink-soft">{node.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                  <span className="inline-flex items-center gap-1">
                    <Icon className="size-3" /> {ACTIVITY_LABEL[node.activity_type]}
                  </span>
                  {node.scheduled_date && <span>{formatDate(node.scheduled_date)}</span>}
                </div>

                {isCurrent && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(activityHref(node))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-lavender px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-lavender/90"
                    >
                      <Play className="size-3" /> Start
                    </button>
                    <button
                      onClick={() => markDone(node)}
                      disabled={completing === node.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
                    >
                      {completing === node.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      Mark done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
