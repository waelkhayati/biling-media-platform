import { CardSkeletons } from "@/components/content-skeleton";
import { SiteHeader } from "@/components/site-header";

export default function LoadingArticles() {
  return (
    <>
      <SiteHeader />
      <main className="detail-main">
        <header className="catalog-masthead article-masthead page-gutter">
          <h1 className="detail-title">Articles.</h1>
        </header>
        <div className="page-gutter article-directory">
          <CardSkeletons label="Loading articles" grid="article-grid" />
        </div>
      </main>
    </>
  );
}
