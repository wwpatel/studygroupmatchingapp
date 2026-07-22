"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Sparkles, X, Plus } from "lucide-react";

interface MaterialRef {
  id: string;
  title: string;
  subject: string;
}

const COLORS = [
  { id: "lavender", bg: "var(--color-lavender)" },
  { id: "blush", bg: "var(--color-blush)" },
  { id: "sage", bg: "var(--color-sage)" },
  { id: "butter", bg: "var(--color-butter)" },
] as const;

export function ProjectCreator({ materials }: { materials: MaterialRef[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [testDate, setTestDate] = useState("");
  const [topicsInput, setTopicsInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [materialIds, setMaterialIds] = useState<string[]>([]);
  const [color, setColor] = useState<string>("lavender");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addTopic() {
    const t = topicsInput.trim();
    if (t && !topics.includes(t)) setTopics((prev) => [...prev, t]);
    setTopicsInput("");
  }

  async function create() {
    if (!name.trim() || !subject.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          testDates: testDate ? [testDate] : [],
          topics,
          materialIds,
          color,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create the project.");
        setLoading(false);
        return;
      }
      router.push(`/projects/${data.projectId}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> New project
      </Button>
    );
  }

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">New project</h2>
          <button onClick={() => setOpen(false)} className="text-ink-faint hover:text-ink">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="p-name">Class name</Label>
            <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="AP Chemistry" />
          </div>
          <div>
            <Label htmlFor="p-subject">Subject</Label>
            <Input id="p-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Chemistry" />
          </div>
        </div>

        <div>
          <Label htmlFor="p-test">Next test date (optional)</Label>
          <input
            id="p-test"
            type="date"
            value={testDate}
            onChange={(e) => setTestDate(e.target.value)}
            className="w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
          />
        </div>

        <div>
          <Label>Topics to cover (optional)</Label>
          <div className="flex gap-2">
            <Input
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic();
                }
              }}
              placeholder="e.g. Stoichiometry"
            />
            <Button type="button" variant="secondary" onClick={addTopic}>
              Add
            </Button>
          </div>
          {topics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full bg-lavender-soft px-2.5 py-0.5 text-xs font-medium text-lavender-deep"
                >
                  {t}
                  <button onClick={() => setTopics((prev) => prev.filter((x) => x !== t))}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-ink-faint">
            Leave blank and Nova will infer the core topics for this class.
          </p>
        </div>

        {materials.length > 0 && (
          <div>
            <Label>Attach materials (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {materials.map((m) => {
                const on = materialIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setMaterialIds((prev) => (on ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      on ? "border-lavender bg-lavender-soft text-lavender-deep" : "border-line text-ink-soft",
                    )}
                  >
                    {m.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <Label>Color</Label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setColor(c.id)}
                className={cn(
                  "size-8 rounded-full border-2 transition-transform",
                  color === c.id ? "scale-110 border-ink" : "border-transparent",
                )}
                style={{ background: c.bg }}
                aria-label={c.id}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button onClick={create} loading={loading} disabled={!name.trim() || !subject.trim()}>
          <Sparkles className="size-4" />
          {loading ? "Building your study plan..." : "Create project & study plan"}
        </Button>
      </CardBody>
    </Card>
  );
}
