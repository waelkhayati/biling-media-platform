import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCards } from "@/components/editorial-articles";
import { ContentLink } from "@/components/content-link";
import { EpisodeArchive, EpisodeFacts } from "@/components/episode-archive";
import { YouTubePlayer } from "@/components/youtube-player";
import { CommunityPanel } from "@/components/community-panel";
import { getArticles, getEpisode } from "@/lib/content-api";
import { contentMetadata } from "@/lib/content-metadata";
import { episodePath, showPath, youtubeThumbnail } from "@/lib/content-paths";

type EpisodePageProps = {
  params: Promise<{ slug: string; episodeSlug: string }>;
  searchParams: Promise<{ commentsPage?: string; commentsSort?: string }>;
};

async function loadEpisode(params: EpisodePageProps["params"]) {
  const { slug, episodeSlug } = await params;
  const detail = await getEpisode(slug, episodeSlug);
  if (!detail) notFound();
  return detail;
}

export async function generateMetadata({ params }: EpisodePageProps): Promise<Metadata> {
  const { episode, show } = await loadEpisode(params);
  return contentMetadata({
    title: episode.title,
    description: episode.description?.trim() || `An episode of ${show.title} on Biling Media.`,
    path: episodePath(show.slug, episode.slug),
    image: episode.youtubeVideoId ? youtubeThumbnail(episode.youtubeVideoId) : undefined,
  });
}

export default async function EpisodePage({ params, searchParams }: EpisodePageProps) {
  const { episode, show, relatedEpisodes } = await loadEpisode(params);
  const editorial = await getArticles({ show: show.slug, episode: episode.slug, limit: 3 }).catch(
    () => null,
  );
  const productionPath = showPath(show.slug);
  const communityQuery = await searchParams;
  const commentsPage = /^\d{1,4}$/.test(communityQuery.commentsPage ?? "")
    ? Math.max(1, Number(communityQuery.commentsPage))
    : 1;
  const commentsSort = communityQuery.commentsSort === "oldest" ? "oldest" : "newest";

  return (
    <>
      <div className="episode-stage section-dark page-gutter">
        <div className="episode-stage-inner">
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <ContentLink className="detail-link" href="/#productions">
              Discovery
            </ContentLink>
            <span aria-hidden="true">/</span>
            <ContentLink className="detail-link" href={productionPath}>
              {show.title}
            </ContentLink>
          </nav>
          <h1 className="detail-title" dir="auto">
            {episode.title}
          </h1>
          <EpisodeFacts episode={episode} />
          <YouTubePlayer videoId={episode.youtubeVideoId} title={episode.title} />
        </div>
      </div>

      <section
        className="detail-section page-gutter episode-information"
        aria-labelledby="episode-information"
      >
        <div>
          <h2 className="section-title" id="episode-information">
            About this episode
          </h2>
          <p className="detail-description" dir="auto">
            {episode.description || "No episode description is available."}
          </p>
        </div>
        <aside className="episode-show">
          <h2 className="episode-show-title" dir="auto">
            {show.title}
          </h2>
          {show.description && (
            <p className="detail-description" dir="auto">
              {show.description}
            </p>
          )}
          <ContentLink className="detail-link" href={`${productionPath}#show-episodes`}>
            View all episodes <span aria-hidden="true">↗</span>
          </ContentLink>
        </aside>
      </section>

      <section
        className="detail-section detail-related page-gutter"
        aria-labelledby="related-episodes"
      >
        <h2 className="section-title" id="related-episodes">
          More from {show.title}
        </h2>
        {relatedEpisodes.length > 0 ? (
          <EpisodeArchive episodes={relatedEpisodes} />
        ) : (
          <p className="empty-state">
            No other episodes have been published for this production yet.
          </p>
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
        target={{ type: "episode", showSlug: show.slug, slug: episode.slug }}
        path={episodePath(show.slug, episode.slug)}
        page={commentsPage}
        sort={commentsSort}
      />
    </>
  );
}
