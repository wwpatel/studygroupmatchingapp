import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ListChecks, Clock } from "lucide-react";
import type { GroupAgenda } from "@/lib/types/content";

export function AgendaView({ agenda }: { agenda: GroupAgenda }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <ListChecks className="size-4.5 text-ember-dark" />
            Session agenda
          </h3>
          <Badge tone="neutral">{agenda.totalMinutes} min</Badge>
        </div>
        <p className="mt-1.5 text-sm text-ink-soft">{agenda.summary}</p>

        <ol className="mt-4 space-y-3">
          {agenda.items.map((item, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-line p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-line-soft text-xs font-semibold text-ink-soft">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{item.topic}</p>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-ink-faint">
                    <Clock className="size-3" /> {item.durationMinutes}m
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">{item.focus}</p>
                {item.leadStudentName && (
                  <p className="mt-1 text-xs text-teal-dark">Led by {item.leadStudentName}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardBody>
    </Card>
  );
}
