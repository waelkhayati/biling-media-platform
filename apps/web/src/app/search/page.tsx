import type { Metadata } from "next";
import { Suspense } from "react";
import { contentQueryMaxLength, contentQuerySchema } from "@biling/schemas";
import { ArticleCards } from "@/components/editorial-articles";
import { ContentLink } from "@/components/content-link";
import { DiscoveryForm } from "@/components/discovery-form";
import { EpisodeArchive } from "@/components/episode-archive";
import { ProductionGrid } from "@/components/production-grid";
import { SiteHeader } from "@/components/site-header";
import { getPublishedShows, searchContent } from "@/lib/content-api";

export const metadata: Metadata = {
  title: "Search",
  description: "Search for Biling Media productions, episodes, and articles.",
  robots: { index: false, follow: true },
};

async function SearchSuggestions() {
  const shows = await getPublishedShows({ limit: 5 });
  const suggestions = [...new Set(shows.map((show) => show.title.trim()))].filter(
    (title) => contentQuerySchema.safeParse(title).success,
  );

  return (
    <>
      {suggestions.length > 0 && (
        <section className="catalog-suggestions" aria-labelledby="suggestions-title">
          <h2 id="suggestions-title">Try a production title</h2>
          <ul role="list">
            {suggestions.map((title) => (
              <li key={title}>
                <ContentLink href={`/search?${new URLSearchParams({ q: title })}`} dir="auto">
                  {title}
                </ContentLink>
              </li>
            ))}
          </ul>
        </section>
      )}
      <ContentLink className="detail-link" href="/shows">
        Browse all productions <span aria-hidden="true">↗</span>
      </ContentLink>
    </>
  );
}

async function SearchResults({ query }: { query: string }) {
  const { shows, episodes, articles, hasMore } = await searchContent(query);

  if (!shows.length && !episodes.length && !articles.length) {
    return (
      <>
        <p className="catalog-state">
          No matches for <bdi>{query}</bdi>. Try a different title or keyword.
        </p>
        <SearchSuggestions />
      </>
    );
  }

  return (
    <>
      {(hasMore.shows || hasMore.episodes || hasMore.articles) && (
        <p className="catalog-state">
          Showing the first matches. Refine your search to narrow the results.
        </p>
      )}
      <section className="search-group" aria-labelledby="search-shows">
        <div className="catalog-toolbar">
          <h2 id="search-shows" className="section-title">
            Productions
          </h2>
          <span className="catalog-count">
            {shows.length}
            {hasMore.shows && "+"} matches
          </span>
        </div>
        {shows.length ? (
          <ProductionGrid shows={shows} />
        ) : (
          <p className="catalog-state">No matching productions.</p>
        )}
      </section>
      <section className="search-group" aria-labelledby="search-episodes">
        <div className="catalog-toolbar">
          <h2 id="search-episodes" className="section-title">
            Episodes
          </h2>
          <span className="catalog-count">
            {episodes.length}
            {hasMore.episodes && "+"} matches
          </span>
        </div>
        {episodes.length ? (
          <EpisodeArchive episodes={episodes} showContext />
        ) : (
          <p className="catalog-state">No matching episodes.</p>
        )}
      </section>
      <section className="search-group" aria-labelledby="search-articles">
        <div className="catalog-toolbar">
          <h2 id="search-articles" className="section-title">
            Articles
          </h2>
          <span className="catalog-count">
            {articles.length}
            {hasMore.articles && "+"} matches
          </span>
        </div>
        {articles.length ? (
          <ArticleCards articles={articles} />
        ) : (
          <p className="catalog-state">No matching articles.</p>
        )}
      </section>
    </>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const query = contentQuerySchema.safeParse(q);
  const hasQuery = q !== undefined && q !== "";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="detail-main">
        <section className="catalog-masthead page-gutter" aria-labelledby="search-title">
          <h1 className="detail-title" id="search-title">
            Search.
          </h1>
          <p>Find Biling productions, episodes, and articles by title or keyword.</p>
          <DiscoveryForm
            action="/search"
            label="Search productions, episodes, and articles"
            placeholder="Enter a title or keyword"
            query={typeof q === "string" ? q.slice(0, contentQueryMaxLength) : ""}
          />
        </section>
        <section className="catalog-body page-gutter" aria-label="Search results">
          {!query.success && hasQuery && (
            <p className="catalog-state" role="status">
              Enter a search term between 2 and 100 characters.
            </p>
          )}
          <Suspense
            key={query.data ?? ""}
            fallback={
              <p className="catalog-state" role="status">
                {query.success ? "Searching…" : "Loading suggestions…"}
              </p>
            }
          >
            {query.success ? <SearchResults query={query.data} /> : <SearchSuggestions />}
          </Suspense>
        </section>
      </main>
    </>
  );
}
