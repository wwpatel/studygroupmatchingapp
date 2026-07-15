import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "ember" | "gold" | "teal" | "neutral" | "danger";
}

const toneClasses: Record<string, string> = {
  ember: "bg-ember-soft text-ember-dark",
  gold: "bg-gold-soft text-[#7a5a03]",
  teal: "bg-teal-soft text-teal-dark",
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
