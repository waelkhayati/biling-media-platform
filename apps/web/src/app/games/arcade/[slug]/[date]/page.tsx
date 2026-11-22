import { notFound } from "next/navigation";
import { arcadeDateSchema, arcadeViewSchema, contentSlugSchema } from "@biling/schemas";
import { getAudienceProfile, gamesRequest } from "@/lib/audience-api";
import { ArcadePlayer } from "@/components/arcade-player";
import { SiteHeader } from "@/components/site-header";

export default async function ArcadePuzzle({
  params,
}: {
  params: Promise<{ slug: string; date: string }>;
}) {
  const { slug, date } = await params;
  if (!contentSlugSchema.safeParse(slug).success || !arcadeDateSchema.safeParse(date).success)
    notFound();
  const [response, profile] = await Promise.all([
    gamesRequest("/" + slug + "/" + date, {}, "arcade"),
    getAudienceProfile(),
  ]);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Unable to load arcade puzzle.");
  const view = arcadeViewSchema.parse(await response.json());
  return (
    <>
      <SiteHeader />
      <main className="game-detail page-gutter arcade-board" data-kind={view.kind}>
        <header>
          <a href="/games">Games</a>
          <span>{view.date} · UTC</span>
          <h1>{view.title}</h1>
          <p>{view.description}</p>
        </header>
        <ArcadePlayer initial={view} signedIn={!!profile} />
      </main>
    </>
  );
}
