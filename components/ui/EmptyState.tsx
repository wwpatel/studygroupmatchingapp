import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const toneClasses = {
  lavender: "bg-lavender-soft text-lavender-deep",
  blush: "bg-blush-soft text-blush-deep",
  sage: "bg-sage-soft text-sage-deep",
  butter: "bg-butter-soft text-butter-deep",
} as const;

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "lavender",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  const [bgClass, textClass] = toneClasses[tone].split(" ");
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-16 text-center animate-fade-up">
      <div className={`mb-4 flex size-12 items-center justify-center rounded-full ${bgClass}`}>
        <Icon className={`size-6 ${textClass}`} strokeWidth={1.75} />
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
