import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "lavender" | "butter" | "sage" | "blush" | "neutral" | "danger";
}

const toneClasses: Record<string, string> = {
  lavender: "bg-lavender-soft text-lavender-deep",
  butter: "bg-butter-soft text-butter-deep",
  sage: "bg-sage-soft text-sage-deep",
  blush: "bg-blush-soft text-blush-deep",
  neutral: "bg-line-soft text-ink-soft",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
