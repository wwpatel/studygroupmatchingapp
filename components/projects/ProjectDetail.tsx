"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, masteryColor, masteryLabel } from "@/lib/utils";
import { StudyPath, type PlanNode } from "./StudyPath";
import { EmptyState } from "@/components/ui/EmptyState";
import { Route, FileText, TrendingUp } from "lucide-react";

interface MaterialRow {
  id: string;
  title: string;
  subject: string;
  uploaded_at: string;
}
interface TopicScore {
  name: string;
  mastery: number;
  attempts: number;
}

type Tab = "plan" | "materials" | "progress";

export function ProjectDetail({
  nodes,
  materials,
  topicScores,
}: {
  nodes: PlanNode[];
  materials: MaterialRow[];
  topicScores: TopicScore[];
}) {
  const [tab, setTab] = useState<Tab>("plan");

  const tabs: { id: Tab; label: string; icon: typeof Route }[] = [
    { id: "plan", label: "Study Plan", icon: Route },
    { id: "materials", label: "Materials", icon: FileText },
    { id: "progress", label: "Progress", icon: TrendingUp },
  ];

  return (
    <div>
      <div className="flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-lavender text-ink"
                : "border-transparent text-ink-soft hover:text-ink",
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "plan" &&
          (nodes.length > 0 ? (
            <StudyPath nodes={nodes} />
          ) : (
            <EmptyState
              icon={Route}
              tone="lavender"
              title="No study plan yet"
              description="Nova couldn't build a plan for this project. It may have hit a hiccup — try creating the project again."
            />
          ))}

        {tab === "materials" &&
          (materials.length > 0 ? (
            <div className="space-y-2">
              {materials.map((m) => (
                <Link
                  key={m.id}
                  href={`/materials/${m.id}`}
                  className="block rounded-xl border border-line bg-paper-raised p-4 transition-colors hover:border-ink/20"
                >
                  <p className="font-medium text-ink">{m.title}</p>
                  <p className="text-xs text-ink-faint">{m.subject}</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              tone="blush"
              title="No materials linked"
              description="Attach materials when you create a project, or upload them on the Materials tab."
            />
          ))}

        {tab === "progress" &&
          (topicScores.length > 0 ? (
            <div className="space-y-3">
              {topicScores.map((t) => (
                <div key={t.name} className="rounded-xl border border-line bg-paper-raised p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{t.name}</span>
                    <span className="text-sm font-semibold" style={{ color: masteryColor(t.mastery) }}>
                      {Math.round(t.mastery)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${t.mastery}%`, background: masteryColor(t.mastery) }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">
                    {masteryLabel(t.mastery)} · {t.attempts} attempt{t.attempts === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={TrendingUp}
              tone="sage"
              title="No progress yet"
              description="Take a quiz or play a game on this subject's topics and your mastery will show up here."
            />
          ))}
      </div>
    </div>
  );
}
