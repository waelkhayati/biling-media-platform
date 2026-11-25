import { SiteHeader } from "@/components/site-header";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="detail-main page-gutter catalog-body" aria-label="Page content">
        <div role="status">
          <span className="sr-only">Loading page</span>
          <div className="content-skeleton-stack" aria-hidden="true">
            <div className="content-skeleton-block content-skeleton-heading" />
            <div className="content-skeleton-block content-skeleton-short" />
            <div className="content-skeleton-block content-skeleton-media" />
          </div>
        </div>
      </main>
    </>
  );
}
