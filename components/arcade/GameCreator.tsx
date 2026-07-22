"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { GAME_META, ARCADE_THEMES, type GameType } from "@/lib/types/arcade";
import { LayoutGrid, Zap, Columns3, PencilLine, FileText, Sparkles } from "lucide-react";

const GAME_ICONS: Record<GameType, typeof LayoutGrid> = {
  match_up: LayoutGrid,
  term_blaster: Zap,
  sort_it: Columns3,
  fill_gap: PencilLine,
};

interface MaterialRef {
  id: string;
  title: string;
  subject: string;
}

export function GameCreator({ materials }: { materials: MaterialRef[] }) {
  const router = useRouter();
  const [gameType, setGameType] = useState<GameType | null>(null);
  const [sourceMode, setSourceMode] = useState<"material" | "topic">(
    materials.length > 0 ? "material" : "topic",
  );
  const [materialId, setMaterialId] = useState(materials[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [theme, setTheme] = useState("retro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate =
    gameType !== null &&
    (sourceMode === "material" ? !!materialId : topic.trim().length > 1);

  async function create() {
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/arcade/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameType,
          theme,
          materialId: sourceMode === "material" ? materialId : null,
          topic: sourceMode === "topic" ? topic.trim() : null,
          subject: sourceMode === "topic" ? subject.trim() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't create that game.");
        setLoading(false);
        return;
      }
      router.push(`/arcade/${data.gameId}`);
    } catch {
      setError("Something went wrong. Try again.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-6">
        {/* 1. Game type */}
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">1. Pick a game</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {(Object.keys(GAME_META) as GameType[]).map((gt) => {
              const Icon = GAME_ICONS[gt];
              const active = gameType === gt;
              return (
                <button
                  key={gt}
                  type="button"
                  onClick={() => setGameType(gt)}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-lavender bg-lavender-soft"
                      : "border-line hover:border-ink/30",
                  )}
                >
                  <Icon className={cn("size-5", active ? "text-lavender-deep" : "text-ink-soft")} />
                  <span className="text-sm font-medium text-ink">{GAME_META[gt].label}</span>
                  <span className="text-xs text-ink-faint">{GAME_META[gt].tagline}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Source */}
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">2. What should it cover?</p>
          <div className="mb-3 inline-flex rounded-lg border border-line bg-line-soft p-1">
            {materials.length > 0 && (
              <button
                type="button"
                onClick={() => setSourceMode("material")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  sourceMode === "material" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft",
                )}
              >
                <FileText className="size-3.5" /> A material
              </button>
            )}
            <button
              type="button"
              onClick={() => setSourceMode("topic")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                sourceMode === "topic" ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft",
              )}
            >
              <Sparkles className="size-3.5" /> A topic
            </button>
          </div>

          {sourceMode === "material" ? (
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="w-full rounded-xl border border-line bg-paper-raised px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink/40 focus:ring-2 focus:ring-lavender/30"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} ({m.subject})
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="topic">Topic</Label>
                <Input
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Cell organelles"
                />
              </div>
              <div>
                <Label htmlFor="subject">Subject (optional)</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Biology"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Theme */}
        <div>
          <p className="mb-2 text-sm font-semibold text-ink">3. Choose a theme</p>
          <div className="flex flex-wrap gap-2">
            {ARCADE_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all",
                  theme === t.id ? "border-lavender" : "border-transparent",
                )}
                style={{ background: t.bg, color: t.text }}
              >
                <span>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button onClick={create} loading={loading} disabled={!canCreate} className="w-full sm:w-auto">
          <Sparkles className="size-4" />
          {loading ? "Building your game..." : "Create game"}
        </Button>
      </CardBody>
    </Card>
  );
}
