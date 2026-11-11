import { CommunityCallout } from "@/components/community-callout";
import { MediaPlaceholder, SectionLabel } from "@/components/editorial-ui";
import { SiteHeader } from "@/components/site-header";
import { YouTubeMedia } from "@/components/youtube-media";
import { getHomeContent } from "@/lib/content-api";
import type { PublishedEpisodeSummary, PublishedShowSummary } from "@biling/contracts";

const tickerItems = [
  "In art we trust",
  "Biling Media",
  "Independent voices",
  "From Tunisia",
  "Original productions",
  "Live when we're on air",
];

export const dynamic = "force-dynamic";

function ProductionCard({
  show,
  featured = false,
}: {
  show: PublishedShowSummary;
  featured?: boolean;
}) {
  const mediaClassName = featured ? "media-placeholder production-media" : "media-placeholder";
  const episode = show.latestEpisode;

  return (
    <article className={featured ? "production-feature" : undefined}>
      {episode?.youtubeVideoId ? (
        <YouTubeMedia
          videoId={episode.youtubeVideoId}
          title={episode.title}
          className={mediaClassName}
        />
      ) : (
        <MediaPlaceholder
          className={mediaClassName}
          title={show.title}
          label="Add a published YouTube episode to show its thumbnail"
        />
      )}
      <div className="content-caption">
        <strong>{show.title}</strong>
        <span>
          {show.episodeCount} {show.episodeCount === 1 ? "episode" : "episodes"}
        </span>
      </div>
      {featured && show.description ? <p className="show-description">{show.description}</p> : null}
    </article>
  );
}

function EpisodeCard({ episode }: { episode: PublishedEpisodeSummary }) {
  return (
    <article className="episode-card">
      {episode.youtubeVideoId ? (
        <YouTubeMedia
          videoId={episode.youtubeVideoId}
          title={episode.title}
          className="episode-placeholder"
        />
      ) : (
        <MediaPlaceholder
          className="episode-placeholder"
          title={episode.title}
          label="YouTube video link not added"
        />
      )}
      <div className="content-caption">
        <strong>{episode.title}</strong>
        <span>{episode.showTitle}</span>
      </div>
    </article>
  );
}

export default async function HomePage() {
  const { shows, episodes } = await getHomeContent();
  const featuredShow = shows.find((show) => show.featured) ?? shows[0];
  const additionalShows = featuredShow ? shows.filter((show) => show.id !== featuredShow.id) : [];

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <section className="hero page-gutter" id="top" aria-labelledby="hero-title">
          <div className="hero-copy">
            <SectionLabel>Independent Tunisian media</SectionLabel>
            <h1 className="hero-title" id="hero-title">
              In art
              <span>we trust.</span>
            </h1>
            <p className="hero-description">
              Original voices, live moments, and culture in motion. Welcome to Biling Media.
            </p>
            <a className="button button-light" href="#productions">
              Explore Biling{" "}
              <span className="button-arrow" aria-hidden="true">
                ↘
              </span>
            </a>
          </div>
          <div className="hero-visual">
            <span className="hero-index">ON AIR / ON OUR TERMS</span>
            <span className="hero-caption">
              {featuredShow ? featuredShow.title : "A frame for the real thing."}
              <br />
              {featuredShow ? "Featured production" : "No stock imagery."}
            </span>
            {featuredShow?.latestEpisode?.youtubeVideoId ? (
              <YouTubeMedia
                videoId={featuredShow.latestEpisode.youtubeVideoId}
                title={featuredShow.latestEpisode.title}
                className="hero-media"
              />
            ) : (
              <MediaPlaceholder
                className="hero-media"
                title={featuredShow?.title ?? "Featured Biling production"}
                label={
                  featuredShow
                    ? "Add a published YouTube episode to show its thumbnail"
                    : "Add official studio or production photography"
                }
              />
            )}
          </div>
          <div className="hero-bottomline">
            <span>In art we trust</span>
            <span>Culture / conversation / everything in between</span>
            <a href="#live" aria-label="Jump to the live broadcast section">
              ↓
            </a>
          </div>
        </section>

        <div className="ticker" aria-label="In art we trust — Biling Media">
          <span className="ticker-label">In art we trust</span>
          <div className="ticker-window" aria-hidden="true">
            <div className="ticker-track">
              {[...tickerItems, ...tickerItems].map((item, index) => (
                <span key={`${item}-${index}`}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <section
          className="section section-dark page-gutter"
          id="live"
          aria-labelledby="live-heading"
        >
          <div className="section-heading">
            <div>
              <SectionLabel>Live broadcast</SectionLabel>
              <h2 className="section-title" id="live-heading">
                Here when it happens.
              </h2>
            </div>
            <p className="section-aside">
              Live programming will show up here when an official broadcast is connected.
            </p>
          </div>
          <div className="live-panel">
            <div className="live-panel-copy">
              <span className="live-state">
                <span className="live-dot" aria-hidden="true" />
                Off air
              </span>
              <h3 className="live-title">
                We’re off air.
                <br />
                For now.
              </h3>
              <p className="live-copy">
                No stream is running at the moment. Check back when Biling goes live.
              </p>
            </div>
            <div className="live-panel-art">
              <MediaPlaceholder
                title="Live broadcast preview"
                label="Connect an official live stream or studio image"
              />
            </div>
          </div>
        </section>

        <section
          className="section page-gutter"
          id="productions"
          aria-labelledby="productions-heading"
        >
          <div className="section-heading">
            <div>
              <SectionLabel>Made at Biling</SectionLabel>
              <h2 className="section-title" id="productions-heading">
                Room for the real stories.
              </h2>
            </div>
            <p className="section-aside">
              {shows.length
                ? "Discover published Biling productions and watch their latest episodes."
                : "Published Biling productions will appear here as they are added to the catalogue."}
            </p>
          </div>
          {featuredShow ? (
            <div className="production-grid">
              <ProductionCard show={featuredShow} featured />
              <div className="production-aside">
                {additionalShows.length ? (
                  additionalShows
                    .slice(0, 4)
                    .map((show) => <ProductionCard key={show.id} show={show} />)
                ) : (
                  <p className="empty-state empty-state-compact">
                    More Biling productions will join the collection here.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="empty-state">
              The Biling Originals catalogue is being prepared. Published shows will appear here.
            </p>
          )}
        </section>

        <section
          className="section section-orange page-gutter"
          id="episodes"
          aria-labelledby="episodes-heading"
        >
          <div className="section-heading">
            <div>
              <SectionLabel>Recently released</SectionLabel>
              <h2 className="section-title" id="episodes-heading">
                Latest episodes.
              </h2>
            </div>
            <p className="section-aside">
              {episodes.length
                ? "Catch up on recently published Biling episodes."
                : "Published episodes with YouTube links will appear here."}
            </p>
          </div>
          {episodes.length ? (
            <div className="episode-strip">
              {episodes.slice(0, 3).map((episode) => (
                <EpisodeCard key={episode.id} episode={episode} />
              ))}
            </div>
          ) : (
            <p className="empty-state">
              No episodes have been published yet. Add a YouTube video ID to an episode to make it
              watchable here.
            </p>
          )}
        </section>

        <section className="section page-gutter" id="people" aria-labelledby="people-heading">
          <div className="section-heading">
            <div>
              <SectionLabel>The voices behind the work</SectionLabel>
              <h2 className="section-title" id="people-heading">
                People make the picture.
              </h2>
            </div>
            <p className="section-aside">
              Hosts and contributors deserve to be introduced with their real names and real
              portraits.
            </p>
          </div>
          <div className="people-grid">
            <MediaPlaceholder
              className="personality-placeholder"
              title="Biling host portrait"
              label="Add an approved portrait and contributor name"
            />
            <MediaPlaceholder
              className="personality-placeholder"
              title="Biling contributor portrait"
              label="Add an approved portrait and contributor name"
            />
          </div>
        </section>

        <CommunityCallout />
      </main>
      <footer className="site-footer page-gutter" id="community">
        <span className="footer-brand">
          Biling Media <span className="footer-slogan">In art we trust.</span>
        </span>
        <nav className="footer-nav" aria-label="Footer navigation">
          <a href="#productions">Productions</a>
          <a href="#live">Live</a>
          <a href="#people">People</a>
        </nav>
        <small>© {new Date().getFullYear()} Biling Media · Official social links to be added</small>
      </footer>
    </>
  );
}
