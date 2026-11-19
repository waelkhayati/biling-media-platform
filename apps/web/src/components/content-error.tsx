"use client";

import { ContentLink } from "./content-link";

export default function ContentError() {
  return (
    <section className="detail-message page-gutter">
      <h1 className="section-title">Content temporarily unavailable.</h1>
      <p>There was a problem loading this page.</p>
      <div className="detail-actions">
        <button className="button" type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
        <ContentLink className="detail-link" href="/#productions">
          Back to discovery
        </ContentLink>
      </div>
    </section>
  );
}
