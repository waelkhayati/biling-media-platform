"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ContentLink } from "./content-link";

type PrimaryNavigationProps = {
  home: string;
  actions?: ReactNode;
};

export function PrimaryNavigation({ home, actions }: PrimaryNavigationProps) {
  const [open, setOpen] = useState(false);
  const drawerId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      menuButton.current?.focus();
    };
  }, [open]);

  const links = (inDrawer = false) => (
    <>
      <ContentLink href="/shows" onClick={inDrawer ? () => setOpen(false) : undefined}>
        Productions
      </ContentLink>
      <ContentLink href="/articles" onClick={inDrawer ? () => setOpen(false) : undefined}>
        Articles
      </ContentLink>
      <a href={`${home}#episodes`} onClick={inDrawer ? () => setOpen(false) : undefined}>
        Episodes
      </a>
      <a href={`${home}#people`} onClick={inDrawer ? () => setOpen(false) : undefined}>
        People
      </a>
    </>
  );

  return (
    <>
      <nav className="main-nav" aria-label="Main navigation">
        {links()}
      </nav>
      <button
        className="nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={drawerId}
        onClick={() => setOpen(true)}
        ref={menuButton}
      >
        <span aria-hidden="true">☰</span>
        Menu
      </button>
      {open && (
        <div className="nav-drawer" role="presentation" onMouseDown={() => setOpen(false)}>
          <aside
            id={drawerId}
            className="nav-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="nav-drawer-heading">
              <span>Explore Biling</span>
              <button
                className="nav-drawer-close"
                type="button"
                onClick={() => setOpen(false)}
                ref={closeButton}
              >
                <span aria-hidden="true">×</span>
                Close
              </button>
            </div>
            <nav className="nav-drawer-links" aria-label="Main navigation">
              {links(true)}
            </nav>
            {actions && <div className="nav-drawer-actions">{actions}</div>}
          </aside>
        </div>
      )}
    </>
  );
}
