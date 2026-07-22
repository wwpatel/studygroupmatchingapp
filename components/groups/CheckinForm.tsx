"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { celebrate } from "@/components/gamification/Celebration";
import { cn } from "@/lib/utils";
import { ClipboardCheck } from "lucide-react";

const SCALE = [1, 2, 3, 4, 5];

function ScalePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {SCALE.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex size-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
            value === n ? "border-lavender bg-lavender-soft text-lavender-deep" : "border-line text-ink-soft hover:border-ink/30",
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function CheckinForm({ sessionId, topics }: { sessionId: string; topics: string[] }) {
  const router = useRouter();
  const [topic, setTopic] = useState(topics[0] ?? "");
  const [before, setBefore] = useState(3);
  const [after, setAfter] = useState(3);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, topicName: topic, confidenceBefore: before, confidenceAfter: after }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't submit check-in.");
      setLoading(false);
      return;
    }
    celebrate({ xpAwarded: data.xpAwarded, newBadges: data.newBadges });
    setDone(true);
    setLoading(false);
    router.refresh();
  }

  if (done) {
    return (
      <Card>
        <CardBody className="text-center">
          <ClipboardCheck className="mx-auto size-6 text-sage" />
          <p className="mt-2 text-sm font-medium text-ink">Thanks — your check-in was saved.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <h3 className="font-display text-base font-semibold text-ink">Post-session check-in</h3>
        <p className="mt-1 text-sm text-ink-soft">Two quick questions to close the loop.</p>

        <div className="mt-4">
          <Label>Topic</Label>
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
          >
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <Label>Confidence before the session</Label>
          <ScalePicker value={before} onChange={setBefore} />
        </div>

        <div className="mt-4">
          <Label>Confidence after the session</Label>
          <ScalePicker value={after} onChange={setAfter} />
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <Button className="mt-4 w-full" loading={loading} onClick={submit} disabled={!topic}>
          Submit check-in
        </Button>
      </CardBody>
    </Card>
  );
}
