import { BrandLogo } from "./brand-logo";
import { DiscoveryForm } from "./discovery-form";
import { PrimaryNavigation } from "./primary-navigation";

export function SiteHeader({ onDiscovery = true }: { onDiscovery?: boolean }) {
  const home = onDiscovery ? "" : "/";

  return (
    <header className="site-header page-gutter">
      <a className="brand-lockup" href={`${home}#top`} aria-label="Biling Media home">
        <BrandLogo />
        <span className="brand-wordmark">Biling</span>
      </a>
      <PrimaryNavigation home={home} />
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
