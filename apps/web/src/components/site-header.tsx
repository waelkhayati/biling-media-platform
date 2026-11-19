import { BrandLogo } from "./brand-logo";
import { ContentLink } from "./content-link";
import { DiscoveryForm } from "./discovery-form";

export function SiteHeader({ onDiscovery = true }: { onDiscovery?: boolean }) {
  const home = onDiscovery ? "" : "/";

  return (
    <header className="site-header page-gutter">
      <a className="brand-lockup" href={`${home}#top`} aria-label="Biling Media home">
        <BrandLogo />
        <span>Biling Media</span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        <ContentLink href="/shows">Productions</ContentLink>
        <ContentLink href="/articles">Articles</ContentLink>
        <a href={`${home}#episodes`}>Episodes</a>
        <a href={`${home}#people`}>People</a>
      </nav>
      <DiscoveryForm
        action="/search"
        className="header-search"
        label="Search Biling from navigation"
        placeholder="Search Biling"
      />
      <a
        className="live-link header-live"
        href={`${home}#live`}
        aria-label="Live broadcasts, currently off air"
      >
        <span className="live-dot" aria-hidden="true" />
        Live
        <span className="header-live-status">Off air</span>
      </a>
    </header>
  );
}
