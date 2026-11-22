import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { GamePlayer } from "@/components/game-player";
import { getAudienceProfile } from "@/lib/audience-api";
import { getGame } from "@/lib/content-api";
import { syncDailyQuiz } from "@/app/game-actions";

export const dynamic = "force-dynamic";
export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [game, profile] = await Promise.all([
    getGame(slug),
    getAudienceProfile().catch(() => null),
  ]);
  if (!game) notFound();
  const progress =
    game.type === "DAILY_CHALLENGE" && profile ? (await syncDailyQuiz(slug)).draft : undefined;
  const label =
    game.type === "DAILY_CHALLENGE"
      ? "Daily challenge · UTC reset"
      : game.type === "PERSONALITY"
        ? "Personality quiz"
        : "Trivia";
  return (
    <>
      <SiteHeader />
      <main className="game-detail page-gutter">
        <header>
          <a href="/games">Games</a>
          <span>{label}</span>
          <h1>{game.title}</h1>
          {game.description && <p>{game.description}</p>}
        </header>
        <GamePlayer game={game} signedIn={!!profile} progress={progress} />
      </main>
    </>
  );
}
