"use client";

import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn, masteryColor, masteryLabel } from "@/lib/utils";
import { DiagnosticStarter } from "./DiagnosticStarter";

export interface SubjectSkillData {
  subject: string;
  topics: { name: string; mastery: number; attempts: number }[];
}

export function SkillProfileView({
  data,
  allSubjects,
}: {
  data: SubjectSkillData[];
  allSubjects: string[];
}) {
  const [active, setActive] = useState(data[0]?.subject ?? "");
  const current = data.find((d) => d.subject === active);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
        <p className="font-display text-lg font-semibold text-ink">
          No skill data yet
        </p>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
          Take a short diagnostic quiz to seed your skill profile for any subject.
        </p>
        <div className="mx-auto mt-5 max-w-sm">
          <DiagnosticStarter suggestedSubjects={allSubjects} />
        </div>
      </div>
    );
  }

  const chartData =
    current?.topics.map((t) => ({ topic: t.name, mastery: t.mastery })) ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {data.map((d) => (
          <button
            key={d.subject}
            onClick={() => setActive(d.subject)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active === d.subject
                ? "border-lavender bg-lavender text-black"
                : "border-line text-ink-soft hover:border-ink/30",
            )}
          >
            {d.subject}
          </button>
        ))}
      </div>

      {current && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-line bg-paper-raised p-4 lg:col-span-3">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chartData} outerRadius="75%">
                  <PolarGrid stroke="var(--color-line)" />
                  <PolarAngleAxis
                    dataKey="topic"
                    tick={{ fill: "var(--color-ink-soft)", fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--color-ink-faint)", fontSize: 10 }}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="mastery"
                    stroke="#5555cc"
                    fill="#5555cc"
                    fillOpacity={0.28}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(value) => [`${Math.round(Number(value))}%`, "Mastery"]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-line)",
                      background: "var(--color-paper-raised)",
                      fontSize: 13,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:col-span-2 lg:grid-cols-1">
            {[...current.topics]
              .sort((a, b) => b.mastery - a.mastery)
              .map((t) => (
                <div
                  key={t.name}
                  className="rounded-xl border border-line p-3"
                  style={{
                    background: `color-mix(in srgb, ${masteryColor(t.mastery)} 12%, var(--color-paper-raised))`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{t.name}</span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: masteryColor(t.mastery) }}
                    >
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
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-5">
        <h3 className="font-display text-base font-semibold text-ink">
          Add another subject
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Run a quick diagnostic to start tracking mastery in a new subject.
        </p>
        <div className="mt-3">
          <DiagnosticStarter suggestedSubjects={allSubjects.filter((s) => !data.some((d) => d.subject === s))} />
        </div>
      </div>
    </div>
  );
}
