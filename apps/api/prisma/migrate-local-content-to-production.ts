import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { parse } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

const sourceEnvironment = parse(readFileSync(resolve(process.cwd(), "../../.env")));
const sourceUrl = process.env.LOCAL_DATABASE_URL ?? sourceEnvironment.DATABASE_URL;
const targetUrl = process.env.DATABASE_URL;
const commit = process.argv.includes("--commit");

if (!sourceUrl) throw new Error("Local DATABASE_URL is required in the root .env file.");
if (!targetUrl) throw new Error("Run this script through Railway so production DATABASE_URL is available.");

const tunnelUrl = new URL(targetUrl);
tunnelUrl.hostname = "127.0.0.1";
tunnelUrl.port = "55432";

const source = new PrismaClient({ adapter: new PrismaPg({ connectionString: sourceUrl }) });
const target = new PrismaClient({ adapter: new PrismaPg({ connectionString: tunnelUrl.href }) });

async function main() {
  const [sourceShows, sourceArticles, targetShows, targetArticles] = await Promise.all([
    source.show.findMany({ include: { episodes: true }, orderBy: { createdAt: "asc" } }),
    source.article.findMany({
      include: {
        shows: { select: { slug: true } },
        episodes: { select: { slug: true, show: { select: { slug: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    target.show.findMany({ include: { episodes: true }, orderBy: { createdAt: "asc" } }),
    target.article.findMany({
      include: {
        shows: { select: { slug: true } },
        episodes: { select: { slug: true, show: { select: { slug: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const backupPath = resolve(tmpdir(), `biling-production-content-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  await writeFile(
    backupPath,
    JSON.stringify({ createdAt: new Date().toISOString(), shows: targetShows, articles: targetArticles }, null, 2),
    "utf8",
  );

  const targetShowSlugs = new Set(targetShows.map((show) => show.slug));
  const targetArticleSlugs = new Set(targetArticles.map((article) => article.slug));
  const inserts = {
    shows: sourceShows.filter((show) => !targetShowSlugs.has(show.slug)),
    episodes: sourceShows.flatMap((show) =>
      show.episodes.filter(
        (episode) =>
          !targetShows
            .find((targetShow) => targetShow.slug === show.slug)
            ?.episodes.some((targetEpisode) => targetEpisode.slug === episode.slug),
      ),
    ),
    articles: sourceArticles.filter((article) => !targetArticleSlugs.has(article.slug)),
  };

  process.stdout.write(
    `Production content backup: ${backupPath}\n` +
      `Local content: ${sourceShows.length} shows, ${sourceShows.reduce((total, show) => total + show.episodes.length, 0)} episodes, ${sourceArticles.length} articles.\n` +
      `Append-only migration: ${inserts.shows.length} new shows, ${inserts.episodes.length} new episodes, ${inserts.articles.length} new articles.\n`,
  );

  if (!commit) {
    process.stdout.write("Dry run complete. Re-run with --commit to write production content.\n");
    return;
  }

  await target.$transaction(async (tx) => {
    for (const show of inserts.shows) {
      await tx.show.create({
        data: {
          title: show.title,
          slug: show.slug,
          description: show.description,
          posterUrl: show.posterUrl,
          featured: show.featured,
          status: show.status,
          metadata: show.metadata ?? undefined,
          firstPublishedAt: show.firstPublishedAt,
        },
      });
    }

    for (const show of sourceShows) {
      const targetShow = await tx.show.findUnique({ where: { slug: show.slug }, select: { id: true } });
      if (!targetShow) continue;
      const existingEpisodes = await tx.episode.findMany({
        where: { showId: targetShow.id },
        select: { slug: true, youtubeVideoId: true },
      });
      const existingSlugs = new Set(existingEpisodes.map((episode) => episode.slug));
      const existingVideos = new Set(
        existingEpisodes.flatMap((episode) => (episode.youtubeVideoId ? [episode.youtubeVideoId] : [])),
      );
      for (const episode of show.episodes) {
        if (existingSlugs.has(episode.slug) || (episode.youtubeVideoId && existingVideos.has(episode.youtubeVideoId)))
          continue;
        await tx.episode.create({
          data: {
            showId: targetShow.id,
            title: episode.title,
            slug: episode.slug,
            description: episode.description,
            episodeNumber: episode.episodeNumber,
            durationSeconds: episode.durationSeconds,
            youtubeVideoId: episode.youtubeVideoId,
            status: episode.status,
            publishedAt: episode.publishedAt,
            firstPublishedAt: episode.firstPublishedAt,
            metadata: episode.metadata ?? undefined,
          },
        });
      }
    }

    for (const article of inserts.articles) {
      const shows = await tx.show.findMany({ where: { slug: { in: article.shows.map((show) => show.slug) } }, select: { id: true } });
      const episodes = await Promise.all(
        article.episodes.map(({ slug, show }) =>
          tx.episode.findFirst({ where: { slug, show: { slug: show.slug } }, select: { id: true } }),
        ),
      );
      await tx.article.create({
        data: {
          slug: article.slug,
          title: article.title,
          excerpt: article.excerpt,
          body: article.body,
          author: article.author,
          category: article.category,
          tags: article.tags,
          language: article.language,
          imageUrl: article.imageUrl,
          imageAlt: article.imageAlt,
          imageCaption: article.imageCaption,
          imageCredit: article.imageCredit,
          featured: article.featured,
          status: article.status,
          publishedAt: article.publishedAt,
          firstPublishedAt: article.firstPublishedAt,
          seoTitle: article.seoTitle,
          seoDescription: article.seoDescription,
          shows: { connect: shows },
          episodes: { connect: episodes.filter((episode): episode is { id: string } => !!episode) },
        },
      });
    }
  }, { maxWait: 15_000, timeout: 60_000 });

  process.stdout.write("Production content migration complete.\n");
}

main()
  .then(async () => source.$disconnect())
  .then(async () => target.$disconnect())
  .catch(async (error: unknown) => {
    await Promise.all([source.$disconnect(), target.$disconnect()]);
    throw error;
  });
