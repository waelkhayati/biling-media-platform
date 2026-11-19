import type { PublishedEpisodeSummary } from "@biling/contracts";
import { episodePath, youtubeThumbnail } from "@/lib/content-paths";
import { ContentImage } from "./content-image";
import { ContentLink } from "./content-link";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours && `${hours} hr`, minutes && `${minutes} min`, remainder && `${remainder} sec`]
    .filter(Boolean)
    .join(" ");
}

export function EpisodeFacts({ episode }: { episode: PublishedEpisodeSummary }) {
  return (
    <div className="episode-facts">
      {episode.episodeNumber !== undefined && <span>Episode {episode.episodeNumber}</span>}
      <time dateTime={episode.publishedAt}>{dateFormat.format(new Date(episode.publishedAt))}</time>
      {episode.durationSeconds !== undefined && (
        <span>{formatDuration(episode.durationSeconds)}</span>
      )}
    </div>
  );
}

export function EpisodeArchive({
  episodes,
  showContext = false,
}: {
  episodes: PublishedEpisodeSummary[];
  showContext?: boolean;
}) {
  return (
    <ul className="archive-grid" role="list">
      {episodes.map((episode) => (
        <li key={episode.id}>
          <article>
            <ContentLink
              className="archive-card"
              href={episodePath(episode.showSlug, episode.slug)}
            >
              <div className="archive-thumbnail">
                <ContentImage
                  src={
                    episode.youtubeVideoId ? youtubeThumbnail(episode.youtubeVideoId) : undefined
                  }
                  title={episode.title}
                  fallbackLabel={
                    episode.youtubeVideoId ? "Thumbnail unavailable" : "Video unavailable"
                  }
                  sizes="(max-width: 540px) 90vw, (max-width: 850px) 45vw, 30vw"
                />
                {episode.youtubeVideoId && (
                  <span className="youtube-play" aria-hidden="true">
                    ▶
                  </span>
                )}
              </div>
              {showContext && (
                <p className="archive-show-title" dir="auto">
                  {episode.showTitle}
                </p>
              )}
              <h3 dir="auto">{episode.title}</h3>
              <EpisodeFacts episode={episode} />
              {showContext && episode.description && (
                <p className="catalog-description" dir="auto">
                  {episode.description}
                </p>
              )}
            </ContentLink>
          </article>
        </li>
      ))}
    </ul>
  );
}
