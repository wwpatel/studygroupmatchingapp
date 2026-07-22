import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/arcade/GamePlayer";
import type { ArcadeContent, GameType } from "@/lib/types/arcade";

export default async function ArcadeGamePage({ params }: { params: { gameId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: game } = await supabase
    .from("arcade_games")
    .select("id, game_type, theme, topic, content, student_id")
    .eq("id", params.gameId)
    .single();

  if (!game || game.student_id !== user.id) notFound();

  return (
    <GamePlayer
      gameId={game.id}
      gameType={game.game_type as GameType}
      theme={game.theme}
      topic={game.topic}
      content={game.content as unknown as ArcadeContent}
    />
  );
}
