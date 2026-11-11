import { BrandLogo } from "./brand-logo";

export function SiteHeader() {
  return (
    <header className="site-header page-gutter">
      <a className="brand-lockup" href="#top" aria-label="Biling Media home">
        <BrandLogo />
        <span>Biling Media</span>
      </a>
      <nav className="main-nav" aria-label="Main navigation">
        <a href="#productions">Productions</a>
        <a href="#episodes">Episodes</a>
        <a href="#people">People</a>
      </nav>
      <div className="header-tools">
        <span className="header-future" aria-label="Search is not available yet">
          Search <span>soon</span>
        </span>
        <span className="header-future header-account" aria-label="Accounts are not available yet">
          Account <span>soon</span>
        </span>
        <a className="live-link" href="#live" aria-label="Live broadcasts, currently off air">
          <span className="live-dot" aria-hidden="true" />
          Live
          <span className="header-live-status">Off air</span>
        </a>
      </div>
    </header>
  );
}
