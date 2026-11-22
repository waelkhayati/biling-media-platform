import type {
  ArticleSummary,
  GameSummary,
  PublishedEpisodeSummary,
  PublishedShowSummary,
} from "@biling/contracts";
import { articleRoute, Card, episodeRoute, gameRoute, showRoute, still } from "./ui";

export const gameType = {
  TRIVIA: "Trivia",
  PERSONALITY: "Personality quiz",
  DAILY_CHALLENGE: "Daily challenge",
};
export function GameCard({ item }: { item: GameSummary }) {
  return (
    <Card
      title={item.title}
      meta={gameType[item.type] + " · " + item.questionCount + " questions"}
      uri={item.artworkUrl}
      href={gameRoute(item.slug)}
    />
  );
}
export function EpisodeCard({ item }: { item: PublishedEpisodeSummary }) {
  return (
    <Card
      title={item.title}
      meta={item.showTitle}
      uri={still(item.youtubeVideoId)}
      href={episodeRoute(item.showSlug, item.slug)}
    />
  );
}
export function ArticleCard({ item }: { item: ArticleSummary }) {
  return (
    <Card
      title={item.title}
      meta={item.category}
      uri={item.imageUrl}
      href={articleRoute(item.slug)}
    />
  );
}
export function ShowCard({ item, hero }: { item: PublishedShowSummary; hero?: boolean }) {
  return (
    <Card
      title={item.title}
      meta={item.featured ? "Featured production" : "Production"}
      uri={item.posterUrl ?? still(item.latestEpisode?.youtubeVideoId)}
      href={showRoute(item.slug)}
      hero={hero}
    />
  );
}
