import Link from "next/link";
import { arcadeSummarySchema } from "@biling/schemas";
import { SiteHeader } from "@/components/site-header";
import { getGames } from "@/lib/content-api";
import { gamesRequest } from "@/lib/audience-api";

export const metadata = { title: "Biling Arcade" };
export const dynamic = "force-dynamic";
const labels = {
  TRIVIA: "Trivia",
  PERSONALITY: "Personality",
  DAILY_CHALLENGE: "Daily challenge",
} as const;

export default async function GamesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: keyof typeof labels }>;
}) {
  const { type } = await searchParams;
  const [games, arcade] = await Promise.all([
    getGames(type ? { type } : {}).catch(() => null),
    gamesRequest("", {}, "arcade")
      .then(async (response) =>
        response.ok ? arcadeSummarySchema.array().parse(await response.json()) : null,
      )
      .catch(() => null),
  ]);
  return (
    <>
      <SiteHeader />
      <main className="games-shell page-gutter">
        <header className="games-heading">
          <h1>Biling Arcade</h1>
        </header>
        <section className="arcade-feature">
          <h2>Today's puzzles</h2>
          {arcade?.length ? (
            <div className="arcade-lineup">
              {arcade.map((game) => (
                <Link
                  className="arcade-tile"
                  data-kind={game.kind}
                  key={game.slug}
                  href={"/games/arcade/" + game.slug + "/" + game.date}
                >
                  <span className="arcade-glyph" aria-hidden="true">
                    {game.kind === "MOT" ? "A B C" : game.kind === "LINKS" ? "◆ ◆" : "0:59"}
                  </span>
                  <strong>{game.title}</strong>
                  <p>{game.description}</p>
                  <span>
                    {game.activity === "IN_PROGRESS"
                      ? "Continue"
                      : game.activity
                        ? "See result"
                        : "Play today"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p>
              {arcade
                ? "No daily puzzles are scheduled today."
                : "Daily puzzles are temporarily unavailable."}
            </p>
          )}
        </section>
        <h2>Quiz collection</h2>
        <nav className="game-filters" aria-label="Game types">
          <Link href="/games" aria-current={type ? undefined : "page"}>
            All games
          </Link>
          {Object.entries(labels).map(([key, label]) => (
            <Link
              key={key}
              href={"/games?type=" + key}
              aria-current={type === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        {games?.items.length ? (
          <section className="games-grid">
            {games.items.map((game) => (
              <article className="game-card" key={game.id} data-featured={game.featured}>
                <span>{labels[game.type]}</span>
                <h2>
                  <Link href={"/games/" + game.slug}>{game.title}</Link>
                </h2>
                {game.description && <p>{game.description}</p>}
                <footer>
                  <span>{game.questionCount} questions</span>
                  <Link href={"/games/" + game.slug}>Play now</Link>
                </footer>
              </article>
            ))}
          </section>
        ) : (
          <p className="empty-state">
            {games
              ? "No quizzes in this category."
              : "The quiz collection is temporarily unavailable."}
          </p>
        )}
      </main>
    </>
  );
}
