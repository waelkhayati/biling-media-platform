import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getGames } from "@/lib/content-api";

export const metadata = { title: "Games" };
export const dynamic = "force-dynamic";
const labels = { TRIVIA: "Trivia", PERSONALITY: "Personality", DAILY_CHALLENGE: "Daily challenge" } as const;
export default async function GamesPage({ searchParams }: { searchParams: Promise<{ type?: "TRIVIA" | "PERSONALITY" | "DAILY_CHALLENGE" }> }) {
  const { type } = await searchParams;
  const games = await getGames(type ? { type } : {}).catch(() => null);
  return <><SiteHeader /><main className="games-shell page-gutter"><header className="games-heading"><span>Interactive / on air</span><h1>Play Biling.</h1><p>Quick quizzes, daily challenges, and no-pressure entertainment made for the Biling audience.</p></header><nav className="game-filters" aria-label="Game types"><Link href="/games">All games</Link>{Object.entries(labels).map(([key, label]) => <Link key={key} href={`/games?type=${key}`} aria-current={type === key ? "page" : undefined}>{label}</Link>)}</nav>{games?.items.length ? <section className="games-grid">{games.items.map((game) => <article className="game-card" key={game.id} data-featured={game.featured}><span>{labels[game.type]}</span><h2><Link href={`/games/${game.slug}`}>{game.title}</Link></h2>{game.description && <p>{game.description}</p>}<footer><span>{game.questionCount} questions</span><Link href={`/games/${game.slug}`}>Play now</Link></footer></article>)}</section> : <p className="empty-state">No games are live yet. Check back soon.</p>}</main></>;
}
