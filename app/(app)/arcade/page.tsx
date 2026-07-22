import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GameCreator } from "@/components/arcade/GameCreator";
import { GAME_META, themeById, type GameType } from "@/lib/types/arcade";
import { formatDate } from "@/lib/utils";
import { Gamepad2, Sparkles } from "lucide-react";

// A few seeded "Explore" games for the MVP — click to spin up your own copy
// on that topic. (Community games would replace these later.)
const EXPLORE = [
  { gameType: "match_up" as GameType, topic: "The Water Cycle", subject: "Earth Science", emoji: "🌊" },
  { gameType: "term_blaster" as GameType, topic: "Multiplication Facts", subject: "Math", emoji: "⚡" },
  { gameType: "sort_it" as GameType, topic: "Parts of Speech", subject: "English", emoji: "📚" },
  { gameType: "fill_gap" as GameType, topic: "The American Revolution", subject: "US History", emoji: "🇺🇸" },
];

export default async function ArcadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: materials }, { data: recentGames }] = await Promise.all([
    supabase.from("materials").select("id, title, subject").eq("student_id", user.id),
    supabase
      .from("arcade_games")
      .select("id, game_type, theme, topic, subject, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 md:py-10">
      <div className="flex items-center gap-2">
        <Gamepad2 className="size-7 text-lavender-deep" />
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Arcade</h1>
      </div>
      <p className="mt-1 text-ink-soft">
        Turn any material or topic into a game. Beat your best and earn XP.
      </p>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Create a game</h2>
        <GameCreator materials={materials ?? []} />
      </div>

      {recentGames && recentGames.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Recent games</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentGames.map((g) => {
              const theme = themeById(g.theme);
              return (
                <Link key={g.id} href={`/arcade/${g.id}`}>
                  <div
                    className="group flex h-full flex-col justify-between rounded-2xl border border-line p-4 transition-transform hover:-translate-y-0.5"
                    style={{ background: theme.bg, color: theme.text }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{theme.emoji}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{ background: theme.panel, color: theme.subtext }}
                      >
                        {GAME_META[g.game_type as GameType].label}
                      </span>
                    </div>
                    <div className="mt-6">
                      <p className="font-display text-base font-semibold" style={{ color: theme.text }}>
                        {g.topic}
                      </p>
                      <p className="text-xs" style={{ color: theme.subtext }}>
                        {g.subject} · {formatDate(g.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="size-4 text-butter-deep" />
          <h2 className="font-display text-lg font-semibold text-ink">Explore</h2>
        </div>
        <p className="mb-3 text-sm text-ink-soft">
          Popular game ideas — pick one and Nova builds you a fresh copy.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {EXPLORE.map((e) => (
            <Card key={e.topic} className="transition-colors hover:border-lavender/40">
              <CardBody>
                <div className="text-2xl">{e.emoji}</div>
                <p className="mt-2 font-medium text-ink">{e.topic}</p>
                <div className="mt-1">
                  <Badge tone="neutral">{GAME_META[e.gameType].label}</Badge>
                </div>
                <p className="mt-1 text-xs text-ink-faint">{e.subject}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
