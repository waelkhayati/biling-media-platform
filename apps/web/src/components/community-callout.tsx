import { SectionLabel } from "./editorial-ui";

export function CommunityCallout() {
  return (
    <section className="community page-gutter" aria-labelledby="community-title">
      <div>
        <SectionLabel>In art we trust</SectionLabel>
        <h2 className="community-title" id="community-title">
          The story doesn’t stop here.
        </h2>
      </div>
      <p className="community-copy">
        Biling is an independent Tunisian media platform built around original voices and shared
        culture. The community features are still in the works.
      </p>
    </section>
  );
}
