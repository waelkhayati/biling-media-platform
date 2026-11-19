import { ContentLink } from "@/components/content-link";
import { SiteHeader } from "@/components/site-header";

export default function ArticleNotFound() {
  return (
    <>
      <SiteHeader onDiscovery={false} />
      <main className="detail-main page-gutter article-directory">
        <h1 className="detail-title">Article unavailable.</h1>
        <ContentLink className="detail-link" href="/articles">
          Browse articles
        </ContentLink>
      </main>
    </>
  );
}
