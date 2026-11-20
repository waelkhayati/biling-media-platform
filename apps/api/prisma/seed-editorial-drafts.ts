import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: resolve(process.cwd(), "../../.env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error("DATABASE_URL must be set before creating editorial drafts.");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const source = (label: string, href: string) => `[${label}](${href})`;

const drafts = [
  {
    slug: "gta-vi-is-here-what-launch-day-means",
    title: "GTA VI Is Here: What Launch Day Means for the Culture",
    excerpt: "Rockstar has released Grand Theft Auto VI worldwide. Here is the short, spoiler-free case for why the launch matters beyond gaming.",
    category: "Gaming",
    tags: ["gta vi", "gaming", "culture"],
    body: [
      { type: "paragraph", text: "Grand Theft Auto VI is now available for PlayStation 5 and Xbox Series X|S. Rockstar frames the new story around Jason and Lucia, whose failed score pulls them into a conspiracy across Leonida." },
      { type: "heading", text: "A shared launch-day moment" },
      { type: "paragraph", text: "The series has always been bigger than a release calendar. Its music, satire, city design and online conversation give people a common reference point. That is why launch day is also a culture story: players are comparing first impressions, protecting each other from spoilers and testing whether the long wait changed their expectations." },
      { type: "paragraph", text: `For official platform and release information, see ${source("Rockstar's launch announcement", "https://www.rockstargames.com/newswire/article/39akk424a9oo53/grand-theft-auto-vi-now-available")}. This is a review draft; publish only after editorial fact-checking.` },
    ],
  },
  {
    slug: "gta-vi-soundtrack-launch-day-listening",
    title: "GTA VI's Soundtrack Makes Launch Day a Listening Event Too",
    excerpt: "Rockstar says Grand Theft Auto VI: The Album arrives alongside the game, extending the launch beyond the screen.",
    category: "Music",
    tags: ["gta vi", "music", "soundtracks"],
    body: [
      { type: "paragraph", text: "The Grand Theft Auto series treats radio as part of its world-building, so the arrival of an official GTA VI album deserves attention alongside the game itself. Rockstar says the release includes 34 original tracks from a cross-genre roster." },
      { type: "heading", text: "Why the music matters" },
      { type: "paragraph", text: "A game soundtrack can travel differently from a game: into playlists, cars, edits and conversations with people who may never pick up a controller. The interesting question is not only which songs land, but how the music helps players remember a place that only exists on-screen." },
      { type: "paragraph", text: `The release detail comes from ${source("Rockstar's GTA VI launch notice", "https://www.rockstargames.com/newswire/article/39akk424a9oo53/grand-theft-auto-vi-now-available")}. This is a review draft; publish only after editorial fact-checking.` },
    ],
  },
  {
    slug: "carthage-theatre-days-2026-preview",
    title: "Carthage Theatre Days Opens a New Week for Tunis Stages",
    excerpt: "The 27th Journées Théâtrales de Carthage is scheduled for 21 to 28 November, putting theatre at the centre of Tunis' cultural week.",
    category: "Culture",
    tags: ["tunisia", "theatre", "tunis"],
    body: [
      { type: "paragraph", text: "Tunis is entering a theatre-focused week. The 27th Journées Théâtrales de Carthage is scheduled from 21 to 28 November 2026, bringing performances, discussions and a wider public conversation about the stage into the city." },
      { type: "heading", text: "More than a diary date" },
      { type: "paragraph", text: "Festivals are useful when they create a reason to look closely: at artists, audiences and the spaces between them. For Biling readers, this is an invitation to follow the programme with curiosity, ask what stories are travelling across borders and make room for local theatre in a crowded cultural feed." },
      { type: "paragraph", text: `Dates and festival context are drawn from the ${source("official JTC 2026 press dossier", "https://jtcarthage.tn/doc/DossierdePresseJTC2026.pdf")}. This is a review draft; confirm programme details before publishing.` },
    ],
  },
  {
    slug: "tchaika-at-jtc-2026",
    title: "Tchaika Brings a Chekhov Reworking to the JTC 2026 Conversation",
    excerpt: "A Tunisian adaptation of The Seagull is listed in the official competition materials for this year's Carthage Theatre Days.",
    category: "Culture",
    tags: ["tunisia", "theatre", "jtc 2026"],
    body: [
      { type: "paragraph", text: "Tchaika is listed by the Journées Théâtrales de Carthage as a Tunisian production adapted by Moez Mrabet from Anton Chekhov's The Seagull. The listing credits Karim Thlibi for music and names a Tunisian cast." },
      { type: "heading", text: "Why adaptations stay alive" },
      { type: "paragraph", text: "A classic only becomes interesting again when an adaptation gives it a new temperature. This draft is not a review of the production; it is a prompt to watch how a familiar dramatic text meets a contemporary Tunisian stage language." },
      { type: "paragraph", text: `Production credits are from the ${source("official JTC listing for Tchaika", "https://jtcarthage.tn/home-2/")}. This is a review draft; confirm performance details and seek production comment before publishing.` },
    ],
  },
  {
    slug: "les-couloirs-de-la-peur-jtc-2026",
    title: "Inside the Premise of Les couloirs de la Peur at JTC 2026",
    excerpt: "The festival's listing introduces a Tunisian Arabic-language production by Mohamed Dhia Mansouri with a 60-minute running time.",
    category: "Culture",
    tags: ["tunisia", "theatre", "jtc 2026"],
    body: [
      { type: "paragraph", text: "Les couloirs de la Peur appears in the JTC 2026 official competition material as a Tunisian production from Inar Production, written and directed by Mohamed Dhia Mansouri. The listing identifies Arabic as the language and gives a 60-minute duration." },
      { type: "heading", text: "Start with the work, not the noise" },
      { type: "paragraph", text: "Festival weeks often move faster than audiences can process. A useful preview should make room for the basic facts, then let a production speak for itself. This draft is a factual starting point, not a substitute for attending or reviewing the performance." },
      { type: "paragraph", text: `Credits and synopsis context are from the ${source("official JTC listing", "https://jtcarthage.tn/home-2/")}. This is a review draft; confirm all credits and programme information before publishing.` },
    ],
  },
  {
    slug: "jaou-tunis-26-final-weekend",
    title: "JAOU Tunis 26 Enters Its Final Weekend",
    excerpt: "The contemporary-art biennale is scheduled to close on 22 November, making this a moment to catch the city-wide programme.",
    category: "Art",
    tags: ["tunisia", "art", "tunis"],
    body: [
      { type: "paragraph", text: "JAOU Tunis 26 is approaching its listed closing date of 22 November. A city-wide art programme near the end of its run has a particular energy: people compare what they saw, recommend overlooked rooms and turn a calendar event into a shared memory." },
      { type: "heading", text: "Go looking, then talk about it" },
      { type: "paragraph", text: "The best cultural coverage does not pretend to replace a visit. It gives audiences a reason to go, then makes space for the questions they bring back: what held their attention, what felt difficult and what they want to see more of in Tunis." },
      { type: "paragraph", text: `Closing-date context comes from a ${source("local November guide", "https://www.riotimesonline.com/what-to-do-in-tunis-in-november-2026/")}. This is a review draft; verify dates with organisers before publishing.` },
    ],
  },
  {
    slug: "tunis-weekend-culture-guide-november-20-22",
    title: "A Culture-First Weekend in Tunis: What Is on the Radar",
    excerpt: "From theatre and live music to workshops and screenings, the city has several cultural options competing for a place in the weekend.",
    category: "Culture",
    tags: ["tunisia", "tunis", "weekend guide"],
    body: [
      { type: "paragraph", text: "Tunis' late-November calendar is full enough to require choices. Independent listings point to theatre, live music, workshops, screenings and festival programming across the city. Rather than treating culture as background noise, make a plan around one event and leave room to discover another." },
      { type: "heading", text: "Build a better night out" },
      { type: "unordered", items: ["Check the organiser's page before travelling; programmes and doors can change.", "Choose one main event, then add a nearby stop for food, conversation or another performance.", "Share practical access information with friends, not just a poster."] },
      { type: "paragraph", text: `This draft is based on current local listings including ${source("Meeps' Tunis cultural calendar", "https://joinmeeps.com/fr/playlist/quoi-faire-a-tunis-e00w0dzv")}. This is a review draft; verify every listing before publishing.` },
    ],
  },
  {
    slug: "ukraine-overnight-attack-november-2026",
    title: "What to Know About the Reported Overnight Attack on Ukraine",
    excerpt: "A careful, source-led explainer draft on AP's reporting of a major overnight Russian missile and drone attack.",
    category: "World",
    tags: ["ukraine", "world news", "explainer"],
    body: [
      { type: "paragraph", text: "The Associated Press reported on 20 November that Russian missiles and drones struck targets in Ukraine overnight, following a statement by Vladimir Putin that Russia would retaliate for Ukrainian aerial attacks on a bridge linking occupied Crimea with Russia." },
      { type: "heading", text: "Reporting with restraint" },
      { type: "paragraph", text: "Conflict reporting changes quickly and carries real consequences. Any Biling version should keep its claims narrow, name its source, distinguish confirmed facts from claims and link readers to ongoing coverage rather than turn loss into spectacle." },
      { type: "paragraph", text: `This draft relies on ${source("AP's initial report", "https://apnews.com/article/433e18f00cbd37a2a9da94e60fce0e07")}. It requires a same-day editorial update and source review before publication.` },
    ],
  },
  {
    slug: "rohinyga-icj-verdict-explainer-november-2026",
    title: "Why the ICJ's Myanmar Verdict Matters to Rohingya Communities",
    excerpt: "An explainer draft centred on the voices and stakes described in AP reporting from Cox's Bazar.",
    category: "World",
    tags: ["rohingya", "myanmar", "human rights"],
    body: [
      { type: "paragraph", text: "The Associated Press reported that the UN's top court ruled Myanmar committed genocide against the Rohingya minority in its 2017 military operation. The report described refugees in Cox's Bazar watching the verdict and speaking about accountability and the desire to return home." },
      { type: "heading", text: "Keep people at the centre" },
      { type: "paragraph", text: "A legal ruling is important, but it should not become an abstract headline. This story should foreground the people living with displacement, explain what the court decided in plain language and avoid promising outcomes the ruling cannot itself deliver." },
      { type: "paragraph", text: `This draft is based on ${source("AP's report from Cox's Bazar", "https://apnews.com/article/995389b9d83d9c7813dcfd269f054e39")}. It requires legal and editorial review before publication.` },
    ],
  },
  {
    slug: "faa-router-pause-what-happened",
    title: "FAA Router Pause: A Plain-Language Look at the Reported Aviation Disruption",
    excerpt: "A technology and public-infrastructure explainer draft based on AP's reporting of a pause in router installations.",
    category: "Technology",
    tags: ["aviation", "technology", "infrastructure"],
    body: [
      { type: "paragraph", text: "The Associated Press reported that the US Federal Aviation Administration paused the installation of routers linked to a national ground stop and turned off routers already installed. The report described the decision as part of the response to the prior week's disruption." },
      { type: "heading", text: "When infrastructure becomes the story" },
      { type: "paragraph", text: "Most people only notice technical systems when they fail. A useful explainer should avoid false certainty: explain the reported action, distinguish it from a full investigation and show why resilient public infrastructure matters to everyday travel." },
      { type: "paragraph", text: `This draft is based on ${source("AP's live coverage", "https://apnews.com/article/e1fd6fce7b854d0d6d5e97a53138b47b")}. It requires a current aviation-source check before publication.` },
    ],
  },
] as const;

async function seedDrafts(): Promise<void> {
  let created = 0;
  let skipped = 0;

  for (const draft of drafts) {
    const existing = await prisma.article.findUnique({ where: { slug: draft.slug }, select: { id: true } });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.article.create({
      data: {
        ...draft,
        author: "Biling Editorial Desk",
        language: "en",
        status: "DRAFT",
        featured: false,
        body: [...draft.body],
      },
    });
    created += 1;
  }

  process.stdout.write(`Editorial draft seed complete: ${created} created, ${skipped} already present.\n`);
}

seedDrafts()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    await prisma.$disconnect();
    throw error;
  });
