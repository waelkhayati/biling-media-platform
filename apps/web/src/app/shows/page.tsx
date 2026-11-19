import type { Metadata } from "next";
import { Suspense } from "react";
import type { PublishedShowFilters } from "@biling/contracts";
import { contentQueryMaxLength, publishedShowFiltersSchema } from "@biling/schemas";
import { ContentLink } from "@/components/content-link";
import { DiscoveryForm } from "@/components/discovery-form";
import { ProductionGrid } from "@/components/production-grid";
import { getPublishedShows } from "@/lib/content-api";

export const metadata: Metadata = {
  title: "Productions",
  description: "Explore the original productions and episode archives of Biling Media.",
  alternates: { canonical: "/shows" },
};

function directoryPath(query?: string, featured?: PublishedShowFilters["featured"]) {
  const filters = new URLSearchParams();
  if (query) filters.set("q", query);
  if (featured !== undefined) filters.set("featured", featured);
  return filters.size ? `/shows?${filters}` : "/shows";
}

async function DirectoryResults({ filters }: { filters: PublishedShowFilters }) {
  const shows = await getPublishedShows(filters);

  if (shows.length === 0) {
    const filtered = filters.q || filters.featured !== undefined;
    return (
      <p className="catalog-state">
        {filtered
          ? "No productions match these filters."
          : "No productions have been published yet."}
      </p>
    );
  }

  return (
    <>
      <p className="catalog-count">
        {shows.length} {shows.length === 1 ? "production" : "productions"}
      </p>
      <ProductionGrid shows={shows} highlight />
    </>
  );
}

export default async function ShowsDirectory({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; featured?: string | string[] }>;
}) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" && raw.q.trim() === "" ? undefined : raw.q;
  const filters = publishedShowFiltersSchema.safeParse({ q, featured: raw.featured });
  const searchText = typeof q === "string" ? q.slice(0, contentQueryMaxLength) : "";
  const featured = filters.data?.featured;
  const query = filters.data?.q;

  return (
    <>
      <section className="catalog-masthead page-gutter" aria-labelledby="directory-title">
        <h1 className="detail-title" id="directory-title">
          Productions.
        </h1>
        <p>Explore Biling originals and their episode archives.</p>
        <DiscoveryForm
          action="/shows"
          label="Search productions"
          placeholder="Filter by title or description"
          query={searchText}
          featured={featured}
        />
      </section>
      <section className="catalog-body page-gutter" aria-labelledby="directory-results">
        <div className="catalog-toolbar">
          <h2 id="directory-results" className="section-title">
            Production directory
          </h2>
          <nav aria-label="Filter productions" className="catalog-filters">
            <ContentLink
              href={directoryPath(query)}
              aria-current={featured === undefined && filters.success ? "page" : undefined}
            >
              All
            </ContentLink>
            <ContentLink
              href={directoryPath(query, "true")}
              aria-current={featured === "true" ? "page" : undefined}
            >
              Featured
            </ContentLink>
            {featured === "false" && (
              <ContentLink href={directoryPath(query, "false")} aria-current="page">
                Other productions
              </ContentLink>
            )}
            {(!filters.success || query || featured !== undefined) && (
              <ContentLink className="catalog-clear" href="/shows">
                Clear filters
              </ContentLink>
            )}
          </nav>
        </div>
        {filters.success ? (
          <Suspense
            key={directoryPath(query, featured)}
            fallback={
              <p className="catalog-state" role="status">
                Loading productions…
              </p>
            }
          >
            <DirectoryResults filters={filters.data} />
          </Suspense>
        ) : (
          <p className="catalog-state" role="status">
            Use 2 to 100 characters to filter productions. You can also clear your filters and start
            again.
          </p>
        )}
      </section>
    </>
  );
}
