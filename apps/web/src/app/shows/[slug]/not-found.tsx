import { ContentLink } from "@/components/content-link";

export default function ContentNotFound() {
  return (
    <section className="detail-message page-gutter">
      <h1 className="section-title">Page not found.</h1>
      <p>This show or episode may have moved or may be unavailable.</p>
      <ContentLink className="detail-link" href="/#productions">
        Back to discovery
      </ContentLink>
    </section>
  );
}
