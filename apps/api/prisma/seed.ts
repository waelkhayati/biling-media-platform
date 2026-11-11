import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before seeding the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const liveEpisodes = [
  {
    title: "infilet Ep 01 Le 03/11/2026 | بث تجريبي",
    slug: "infilet-episode-01",
    episodeNumber: 1,
    youtubeVideoId: "TF2Kxp6gmng",
    publishedAt: new Date("2026-11-03T00:00:00.000Z"),
  },
  {
    title: "infilet Ep 02 Le 04/11/2026 | بث تجريبي",
    slug: "infilet-episode-02",
    episodeNumber: 2,
    youtubeVideoId: "BXGfBw6Qi9s",
    publishedAt: new Date("2026-11-04T00:00:00.000Z"),
  },
  {
    title: "infilet Ep 03 Le 05/11/2026 | بث تجريبي",
    slug: "infilet-episode-03",
    episodeNumber: 3,
    youtubeVideoId: "jjJIyEeyVIo",
    publishedAt: new Date("2026-11-05T00:00:00.000Z"),
  },
  {
    title: "infilet Ep 04 Le 06/11/2026 | بث تجريبي",
    slug: "infilet-episode-04",
    episodeNumber: 4,
    youtubeVideoId: "kbtRlupMsGE",
    publishedAt: new Date("2026-11-06T00:00:00.000Z"),
  },
  {
    title: "infilet Ep 05 Le 09/11/2026 | بث تجريبي",
    slug: "infilet-episode-05",
    episodeNumber: 5,
    youtubeVideoId: "DoTsKe0sPyE",
    publishedAt: new Date("2026-11-09T00:00:00.000Z"),
  },
  {
    title: "infilet Ep 06 Le 10/11/2026 | بث تجريبي",
    slug: "infilet-episode-06",
    episodeNumber: 6,
    youtubeVideoId: "hyGLKmbw_EM",
    publishedAt: new Date("2026-11-10T00:00:00.000Z"),
  },
  {
    title: "infilet بث تجريبي 02 11 2026",
    slug: "infilet-live-02-11-2026",
    youtubeVideoId: "n4uNTKQGUAo",
    publishedAt: new Date("2026-11-02T00:00:00.000Z"),
  },
];

async function seed(): Promise<void> {
  const show = await prisma.show.upsert({
    where: { slug: "infilet" },
    update: { title: "Infilet", featured: true, status: "PUBLISHED" },
    create: {
      title: "Infilet",
      slug: "infilet",
      featured: true,
      status: "PUBLISHED",
    },
  });

  for (const episode of liveEpisodes) {
    await prisma.episode.upsert({
      where: { youtubeVideoId: episode.youtubeVideoId },
      update: {
        showId: show.id,
        title: episode.title,
        slug: episode.slug,
        episodeNumber: episode.episodeNumber,
        status: "PUBLISHED",
        publishedAt: episode.publishedAt,
      },
      create: {
        ...episode,
        showId: show.id,
        status: "PUBLISHED",
      },
    });
  }
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
