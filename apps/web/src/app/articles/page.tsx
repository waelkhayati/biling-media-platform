import type { Metadata } from "next";
import { articleQuerySchema } from "@biling/schemas";
import { ContentLink } from "@/components/content-link";
import { ArticleCards } from "@/components/editorial-articles";
import { SiteHeader } from "@/components/site-header";
import { getArticles } from "@/lib/content-api";
import { contentMetadata } from "@/lib/content-metadata";

const directoryMetadata = contentMetadata({
  title: "Articles",
  description: "Read the latest from Biling Media.",
  path: "/articles",
});

type Props = { searchParams: Promise<{ category?: string; tag?: string; page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const query = await searchParams;
  if (Object.keys(query).length)
    return { ...directoryMetadata, robots: { index: false, follow: true } };
  return directoryMetadata;
}

export default async function ArticlesPage({ searchParams }: Props) {
  const { category, tag, page } = await searchParams;
  const parsed = articleQuerySchema.safeParse({ category, tag, page });
  const filters = parsed.data;
  const [latest, featured] = await Promise.all([
    getArticles(filters),
    filters?.page === 1 && !filters.category && !filters.tag
      ? getArticles({ featured: "true", limit: 3 })
      : null,
  ]);
  const link = (page: number) => {
    const params = new URLSearchParams();
    if (filters?.category) params.set("category", filters.category);
    if (filters?.tag) params.set("tag", filters.tag);
    if (page > 1) params.set("page", String(page));
    return params.size ? "/articles?" + params : "/articles";
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="detail-main">
        <header className="catalog-masthead article-masthead page-gutter">
          <h1 className="detail-title">Articles.</h1>
        </header>
        <div className="page-gutter article-directory">
          <nav className="article-filters" aria-label="Article categories">
            <ContentLink
              href="/articles"
              aria-current={!filters?.category && !filters?.tag ? "page" : undefined}
            >
              All articles
            </ContentLink>
            {latest.categories.map((category) => (
              <ContentLink
                key={category}
                href={"/articles?" + new URLSearchParams({ category })}
                aria-current={filters?.category === category ? "page" : undefined}
              >
                {category}
              </ContentLink>
            ))}
          </nav>
          {!parsed.success && <p role="status">Invalid filters. Showing the latest articles.</p>}
          {filters?.tag && (
            <p>
              Tag · <bdi>{filters.tag}</bdi>
            </p>
          )}
          {!!featured?.items.length && (
            <section aria-labelledby="editorial-featured">
              <h2 id="editorial-featured" className="section-title">
                Featured
              </h2>
              <ArticleCards articles={featured.items} lead />
            </section>
          )}
          <section aria-labelledby="editorial-latest">
            <h2 id="editorial-latest" className="section-title">
              {filters?.category ?? "Latest articles"}
            </h2>
            {latest.items.length ? (
              <ArticleCards articles={latest.items} />
            ) : (
              <p className="empty-state">No articles in this selection.</p>
            )}
          </section>
          {(latest.page > 1 || latest.hasMore) && (
            <nav className="article-filters" aria-label="Article pages">
              {latest.page > 1 && (
                <ContentLink href={link(latest.page - 1)}>Previous page</ContentLink>
              )}
              <span>Page {latest.page}</span>
              {latest.hasMore && latest.page < 99999 && (
                <ContentLink href={link(latest.page + 1)}>Next page</ContentLink>
              )}
            </nav>
          )}
        </div>
      </main>
    </>
  );
}
