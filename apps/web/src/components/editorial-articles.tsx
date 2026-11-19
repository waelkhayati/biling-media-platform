import Image from "next/image";
import type { ArticleSummary, StudioArticle } from "@biling/contracts";
import { ArticleBody } from "./article-body";
import { ContentLink } from "./content-link";

export function articleHref(slug: string) {
  return "/articles/" + encodeURIComponent(slug);
}

function articleDate(date: string, language: string) {
  return new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(date),
  );
}

export function ArticleCards({
  articles,
  lead = false,
}: {
  articles: ArticleSummary[];
  lead?: boolean;
}) {
  return (
    <div className={lead ? "article-grid article-grid-lead" : "article-grid"}>
      {articles.map((article) => (
        <article
          key={article.id}
          lang={article.language}
          dir={article.language === "ar" ? "rtl" : "ltr"}
        >
          <ContentLink className="article-card" href={articleHref(article.slug)}>
            {article.imageUrl && (
              <div className="article-card-image">
                <Image
                  src={article.imageUrl}
                  alt={article.imageAlt ?? ""}
                  fill
                  sizes="(max-width: 670px) 94vw, 48vw"
                  unoptimized
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <p className="article-kicker">{article.category}</p>
            <h3>{article.title}</h3>
            {article.excerpt && <p className="article-card-excerpt">{article.excerpt}</p>}
            <p className="article-byline">
              <bdi>{article.author}</bdi> ·{" "}
              <time dateTime={article.publishedAt}>
                {articleDate(article.publishedAt, article.language)}
              </time>
            </p>
          </ContentLink>
        </article>
      ))}
    </div>
  );
}

type ReadingArticle = Pick<
  StudioArticle,
  | "title"
  | "excerpt"
  | "category"
  | "author"
  | "language"
  | "publishedAt"
  | "imageUrl"
  | "imageAlt"
  | "imageCaption"
  | "imageCredit"
  | "body"
>;

export function ArticleReading({ article }: { article: ReadingArticle }) {
  return (
    <article
      lang={article.language}
      dir={article.language === "ar" ? "rtl" : "ltr"}
      className="article-reading"
    >
      <header className="article-heading">
        <p className="article-kicker">{article.category}</p>
        <h1>{article.title}</h1>
        {article.excerpt && <p className="article-intro">{article.excerpt}</p>}
        <p className="article-byline">
          <bdi>{article.author}</bdi>
          {article.publishedAt && (
            <>
              {" "}
              ·{" "}
              <time dateTime={article.publishedAt}>
                {articleDate(article.publishedAt, article.language)}
              </time>
            </>
          )}
        </p>
      </header>
      {article.imageUrl && (
        <figure className="article-cover">
          <div className="article-cover-image">
            <Image
              src={article.imageUrl}
              alt={article.imageAlt ?? ""}
              fill
              sizes="(max-width: 1050px) 94vw, 1050px"
              loading="eager"
              unoptimized
              referrerPolicy="no-referrer"
            />
          </div>
          {(article.imageCaption || article.imageCredit) && (
            <figcaption>
              {[article.imageCaption, article.imageCredit].filter(Boolean).join(" · ")}
            </figcaption>
          )}
        </figure>
      )}
      <ArticleBody blocks={article.body} title={article.title} />
    </article>
  );
}
