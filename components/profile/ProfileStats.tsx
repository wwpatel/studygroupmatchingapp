import { FileQuestion, Gamepad2, BookOpen, Clock } from "lucide-react";

export function ProfileStats({
  quizzes,
  games,
  materials,
  studyMinutes,
}: {
  quizzes: number;
  games: number;
  materials: number;
  studyMinutes: number;
}) {
  const tiles = [
    { icon: FileQuestion, label: "Quizzes", value: quizzes, tone: "lavender" },
    { icon: Gamepad2, label: "Games", value: games, tone: "blush" },
    { icon: BookOpen, label: "Materials", value: materials, tone: "sage" },
    { icon: Clock, label: "Study time", value: `${studyMinutes}m`, tone: "butter" },
  ] as const;
  const soft: Record<string, string> = {
    lavender: "bg-lavender-soft text-lavender-deep",
    blush: "bg-blush-soft text-blush-deep",
    sage: "bg-sage-soft text-sage-deep",
    butter: "bg-butter-soft text-butter-deep",
  };
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-2xl border border-line bg-paper-raised p-4 text-center">
          <div className={`mx-auto flex size-9 items-center justify-center rounded-lg ${soft[t.tone]}`}>
            <t.icon className="size-4.5" strokeWidth={1.75} />
          </div>
          <p className="mt-2 font-display text-2xl font-semibold text-ink">{t.value}</p>
          <p className="text-xs text-ink-faint">{t.label}</p>
        </div>
      ))}
    </div>
  );
}
