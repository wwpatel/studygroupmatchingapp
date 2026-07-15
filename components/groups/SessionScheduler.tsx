"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import { CalendarClock, Check } from "lucide-react";

export function SessionScheduler({
  sessionId,
  status,
  proposedTimes,
  scheduledTime,
}: {
  sessionId: string;
  status: string;
  proposedTimes: string[];
  scheduledTime: string | null;
}) {
  const router = useRouter();
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "propose" | "confirm" | "complete", t?: string) {
    setLoading(action + (t ?? ""));
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action, time: t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(null);
        return;
      }
      setTime("");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(null);
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <CalendarClock className="size-4.5 text-ember-dark" />
            Session
          </h3>
          <Badge tone={status === "completed" ? "teal" : status === "confirmed" ? "gold" : "neutral"}>
            {status}
          </Badge>
        </div>

        {scheduledTime ? (
          <p className="mt-3 text-sm text-ink">
            Scheduled for <span className="font-medium">{formatDateTime(scheduledTime)}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">No time confirmed yet.</p>
        )}

        {status !== "completed" && (
          <>
            {proposedTimes.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {proposedTimes.map((t) => (
                  <li key={t} className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm">
                    <span>{formatDateTime(t)}</span>
                    {scheduledTime !== t && (
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={loading === "confirm" + t}
                        onClick={() => act("confirm", t)}
                      >
                        <Check className="size-3.5" /> Confirm
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (time) act("propose", new Date(time).toISOString());
              }}
              className="mt-3 flex items-center gap-2"
            >
              <input
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="flex-1 rounded-xl border border-line bg-paper-raised px-3 py-2 text-sm outline-none focus:border-ink/40 focus:ring-2 focus:ring-ember/15"
              />
              <Button type="submit" size="sm" variant="secondary" loading={loading === "propose" + new Date(time || 0).toISOString()}>
                Propose
              </Button>
            </form>
          </>
        )}

        {status === "confirmed" && (
          <Button className="mt-3 w-full" variant="secondary" loading={loading === "complete"} onClick={() => act("complete")}>
            Mark session complete
          </Button>
        )}

        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
