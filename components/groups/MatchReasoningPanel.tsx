import { Sparkles, ArrowRight } from "lucide-react";

interface Pairing {
  topic: string;
  strongStudentName: string;
  growthStudentName: string;
  note: string;
}

export function MatchReasoningPanel({
  headline,
  reasoning,
  pairings,
}: {
  headline: string;
  reasoning: string;
  pairings: Pairing[];
}) {
  return (
    <div className="bg-nova-burst overflow-hidden rounded-2xl border border-line bg-paper-raised p-6">
      <div className="flex items-center gap-2 text-ember-dark">
        <Sparkles className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">Why this group</span>
      </div>
      <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-ink">
        {headline}
      </h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{reasoning}</p>

      {pairings.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pairings.map((p, i) => (
            <div
              key={i}
              className="rounded-xl border border-line bg-paper-raised/80 p-4 backdrop-blur-sm"
            >
              <span className="inline-block rounded-full bg-gold-soft px-2 py-0.5 text-xs font-medium text-[#7a5a03]">
                {p.topic}
              </span>
              <div className="mt-2.5 flex items-center gap-2 text-sm font-medium text-ink">
                <span className="text-teal-dark">{p.strongStudentName}</span>
                <ArrowRight className="size-3.5 text-ink-faint" />
                <span className="text-ember-dark">{p.growthStudentName}</span>
              </div>
              <p className="mt-1.5 text-xs text-ink-soft">{p.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
