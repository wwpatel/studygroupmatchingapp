"use client";

const ACCENTS = ["lavender", "blush", "sage", "butter"];
const BG: Record<string, string> = {
  lavender: "var(--color-lavender)",
  blush: "var(--color-blush)",
  sage: "var(--color-sage)",
  butter: "var(--color-butter)",
};

// Seven bars, one per day (oldest → today). Cycles accent colors.
export function XpWeekChart({ days }: { days: { label: string; xp: number }[] }) {
  const max = Math.max(10, ...days.map((d) => d.xp));
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
      {days.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[11px] font-semibold text-ink-soft">{d.xp > 0 ? d.xp : ""}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md transition-[height] duration-500"
              style={{
                height: `${Math.max(4, (d.xp / max) * 90)}px`,
                background: d.xp > 0 ? BG[ACCENTS[i % 4]] : "var(--color-line)",
              }}
            />
          </div>
          <span className="text-[11px] text-ink-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
