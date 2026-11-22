import type { ReactNode } from "react";
import { BrandLogo } from "./brand-logo";
import { DiscoveryForm } from "./discovery-form";
import { PrimaryNavigation } from "./primary-navigation";

export function SiteHeaderFrame({ account }: { account?: ReactNode }) {
  return (
    <header className="site-header page-gutter">
      <a className="brand-lockup" href="/#top" aria-label="Biling Media home">
        <BrandLogo />
        <span className="brand-wordmark">Biling</span>
      </a>
      <PrimaryNavigation actions={account} />
      <DiscoveryForm
        action="/search"
        className="header-search"
        label="Search Biling from navigation"
        placeholder="Search Biling"
      />
      <div className="header-actions">
        <a
          className="live-link header-live"
          href="/#live"
          aria-label="Live broadcasts, currently off air"
        >
          <span className="live-dot" aria-hidden="true" />
          Live
          <span className="header-live-status">Off air</span>
        </a>
        {account}
      </div>
    </header>
  );
}
