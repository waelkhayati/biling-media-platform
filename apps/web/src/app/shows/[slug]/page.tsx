import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { PublishedShowDetail } from "@biling/contracts";
import { ContentImage } from "@/components/content-image";
import { ArticleCards } from "@/components/editorial-articles";
import { ContentLink } from "@/components/content-link";
import { SectionLabel } from "@/components/editorial-ui";
import { EpisodeArchive } from "@/components/episode-archive";
import { YouTubePlayer } from "@/components/youtube-player";
import { CommunityPanel } from "@/components/community-panel";
import { getArticles, getShow } from "@/lib/content-api";
import { contentMetadata } from "@/lib/content-metadata";
import { episodePath, showPath, youtubeThumbnail } from "@/lib/content-paths";

type ShowPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ commentsPage?: string; commentsSort?: string }>;
};

async function loadShow(params: ShowPageProps["params"]) {
  const { slug } = await params;
  const show = await getShow(slug);
  if (!show) notFound();
  return show;
}

function showMedia(show: PublishedShowDetail) {
  return {
    poster: show.posterUrl?.match(/^https?:\/\//i) ? show.posterUrl : undefined,
    featuredEpisode: show.episodes.find((episode) => episode.youtubeVideoId),
    trailerId: show.metadata.trailerYoutubeVideoId,
  };
}

export async function generateMetadata({ params }: ShowPageProps): Promise<Metadata> {
  const show = await loadShow(params);
  const { poster, trailerId, featuredEpisode } = showMedia(show);
  const videoId = trailerId ?? featuredEpisode?.youtubeVideoId;

  return contentMetadata({
    title: show.title,
    description:
      show.description?.trim() || `Explore ${show.title} and its episode archive on Biling Media.`,
    path: showPath(show.slug),
    image: poster ?? (videoId ? youtubeThumbnail(videoId) : undefined),
  });
}

export default async function ShowPage({ params, searchParams }: ShowPageProps) {
  const show = await loadShow(params);
  const editorial = await getArticles({ show: show.slug, limit: 3 }).catch(() => null);
  const { poster, featuredEpisode, trailerId } = showMedia(show);
  const coverVideoId = trailerId ?? featuredEpisode?.youtubeVideoId;
  const communityQuery = await searchParams;
  const commentsPage = /^\d{1,4}$/.test(communityQuery.commentsPage ?? "")
    ? Math.max(1, Number(communityQuery.commentsPage))
    : 1;
  const commentsSort = communityQuery.commentsSort === "oldest" ? "oldest" : "newest";

  return (
    <>
      <div className="show-masthead page-gutter">
        <nav aria-label="Breadcrumb">
          <ContentLink className="detail-link" href="/#productions">
            ← Back to discovery
          </ContentLink>
        </nav>
        <div className="show-masthead-grid">
          <div>
            <SectionLabel>
              {show.featured ? "Featured production" : "Biling production"}
            </SectionLabel>
            <h1 className="detail-title" dir="auto">
              {show.title}
            </h1>
            {show.description && (
              <p className="detail-description" dir="auto">
                {show.description}
              </p>
            )}
            <div className="episode-facts">
              <span>
                {show.episodes.length} {show.episodes.length === 1 ? "episode" : "episodes"}
              </span>
              {show.metadata.genre && <span>{show.metadata.genre}</span>}
              {show.metadata.releaseYear && <span>{show.metadata.releaseYear}</span>}
            </div>
            {show.episodes.length > 0 && (
              <a className="button button-light" href="#show-episodes">
                Browse episodes <span aria-hidden="true">↓</span>
              </a>
            )}
          </div>
          <div className="show-cover">
            <ContentImage
              src={poster ?? (coverVideoId ? youtubeThumbnail(coverVideoId) : undefined)}
              title={show.title}
              alt={poster ? `Cover artwork for ${show.title}` : ""}
              fallbackLabel="Cover artwork unavailable"
              sizes="(max-width: 850px) 90vw, 50vw"
              eager
            />
          </div>
        </div>
      </div>

      {(trailerId || featuredEpisode) && (
        <section
          className="detail-section detail-feature-section section-dark page-gutter"
          aria-labelledby="show-video"
        >
          <div className={trailerId ? "detail-feature" : "detail-feature detail-feature-episode"}>
            <div>
              <SectionLabel>{trailerId ? "Trailer" : "From the archive"}</SectionLabel>
              <h2 className="section-title" id="show-video" dir="auto">
                {trailerId ? "Watch the trailer" : featuredEpisode?.title}
              </h2>
            </div>
            <div>
              {trailerId ? (
                <YouTubePlayer videoId={trailerId} title={`${show.title} trailer`} lazy />
              ) : featuredEpisode ? (
                <ContentLink
                  className="button button-light"
                  href={episodePath(show.slug, featuredEpisode.slug)}
                >
                  Watch episode <span aria-hidden="true">▶</span>
                </ContentLink>
              ) : null}
            </div>
          </div>
        </section>
      )}

      <section
        className="detail-section page-gutter"
        id="show-episodes"
        aria-labelledby="archive-title"
      >
        <h2 className="section-title" id="archive-title">
          Episode archive
        </h2>
        {show.episodes.length > 0 ? (
          <EpisodeArchive episodes={show.episodes} />
        ) : (
          <p className="empty-state">No episodes have been published for this production yet.</p>
        )}
      </section>
      {!!editorial?.items.length && (
        <section className="detail-section page-gutter" aria-labelledby="related-editorial">
          <h2 id="related-editorial" className="section-title">
            Related articles
          </h2>
          <ArticleCards articles={editorial.items} />
        </section>
      )}
      <CommunityPanel
        target={{ type: "show", slug: show.slug }}
        path={showPath(show.slug)}
        page={commentsPage}
        sort={commentsSort}
      />
    </>
  );
}
