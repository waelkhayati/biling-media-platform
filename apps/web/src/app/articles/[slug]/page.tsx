import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleCards, ArticleReading, articleHref } from "@/components/editorial-articles";
import { ContentLink } from "@/components/content-link";
import { SiteHeader } from "@/components/site-header";
import { getArticle } from "@/lib/content-api";
import { contentMetadata, siteUrl } from "@/lib/content-metadata";
import { episodePath, showPath } from "@/lib/content-paths";

type Props = { params: Promise<{ slug: string }> };
const load = cache(getArticle);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await load((await params).slug);
  if (!article) notFound();
  const meta = contentMetadata({
    title: article.seoTitle ?? article.title,
    description: article.seoDescription ?? article.excerpt ?? article.title,
    path: articleHref(article.slug),
    image: article.imageUrl ?? undefined,
  });
  return {
    ...meta,
    openGraph: {
      ...meta.openGraph,
      type: "article",
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      section: article.category,
      tags: article.tags,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = await load((await params).slug);
  if (!article) notFound();
  const url = new URL(articleHref(article.slug), siteUrl()).href;
  const structured = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.seoDescription ?? article.excerpt ?? undefined,
    image: article.imageUrl ?? undefined,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    mainEntityOfPage: url,
    inLanguage: article.language,
    articleSection: article.category,
    author: { "@type": "Person", name: article.author },
    publisher: { "@type": "Organization", name: "Biling Media", url: siteUrl().origin },
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to article
      </a>
      <SiteHeader onDiscovery={false} />
      <main className="detail-main page-gutter article-page" id="main">
        <ContentLink className="detail-link" href="/articles">
          All articles
        </ContentLink>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }}
        />
        <ArticleReading article={article} />
        <div className="article-reading-footer">
          <nav className="article-filters" aria-label="Article topics">
            <ContentLink href={"/articles?" + new URLSearchParams({ category: article.category })}>
              {article.category}
            </ContentLink>
            {article.tags.map((tag) => (
              <ContentLink key={tag} href={"/articles?" + new URLSearchParams({ tag })}>
                {tag}
              </ContentLink>
            ))}
          </nav>
          <nav className="article-filters" aria-label="Share article">
            <a
              href={
                "mailto:?" +
                new URLSearchParams({ subject: article.title, body: url })
                  .toString()
                  .replace(/\+/g, "%20")
              }
            >
              Share by email
            </a>
            <a
              href={"https://www.facebook.com/sharer/sharer.php?" + new URLSearchParams({ u: url })}
            >
              Share on Facebook
            </a>
          </nav>
          {!!(article.shows.length || article.episodes.length) && (
            <section>
              <h2>Related productions and episodes</h2>
              <ul>
                {article.shows.map((show) => (
                  <li key={show.slug}>
                    <ContentLink href={showPath(show.slug)}>{show.title}</ContentLink>
                  </li>
                ))}
                {article.episodes.map((episode) => (
                  <li key={episodePath(episode.showSlug, episode.slug)}>
                    <ContentLink href={episodePath(episode.showSlug, episode.slug)}>
                      {episode.title}
                    </ContentLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        {!!article.related.length && (
          <section aria-labelledby="article-related" className="article-related">
            <h2 id="article-related" className="section-title">
              Related articles
            </h2>
            <ArticleCards articles={article.related} />
          </section>
        )}
      </main>
    </>
  );
}
