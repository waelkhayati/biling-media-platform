import type { PublishedShowSummary } from "@biling/contracts";
import { showPath, youtubeThumbnail } from "@/lib/content-paths";
import { ContentImage } from "./content-image";
import { ContentLink } from "./content-link";

export function ProductionGrid({
  shows,
  highlight = false,
}: {
  shows: PublishedShowSummary[];
  highlight?: boolean;
}) {
  return (
    <ul className={highlight ? "catalog-grid catalog-grid-featured" : "catalog-grid"} role="list">
      {shows.map((show) => {
        const videoId = show.latestEpisode?.youtubeVideoId;
        const poster =
          show.posterUrl && /^https?:\/\//i.test(show.posterUrl) ? show.posterUrl : undefined;

        return (
          <li key={show.id} data-featured={show.featured}>
            <article>
              <ContentLink
                className="catalog-card"
                href={showPath(show.slug)}
                aria-labelledby={`production-${show.id}`}
              >
                <div className="catalog-artwork">
                  <ContentImage
                    src={poster ?? (videoId ? youtubeThumbnail(videoId) : undefined)}
                    title={show.title}
                    fallbackLabel="Cover artwork unavailable"
                    sizes={`(max-width: 560px) 90vw, (max-width: 920px) 45vw, ${highlight ? "66vw" : "30vw"}`}
                  />
                  {show.featured && <span className="catalog-featured-label">Featured</span>}
                </div>
                <div className="catalog-card-title">
                  <h3 id={`production-${show.id}`} dir="auto">
                    {show.title}
                  </h3>
                  <span aria-hidden="true">↗</span>
                </div>
                <p className="catalog-episode-count">
                  {show.episodeCount} {show.episodeCount === 1 ? "episode" : "episodes"}
                </p>
                {show.description && (
                  <p className="catalog-description" dir="auto">
                    {show.description}
                  </p>
                )}
              </ContentLink>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
