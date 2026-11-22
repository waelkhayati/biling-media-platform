import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

export default function ShowsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="detail-main">
        {children}
      </main>
    </>
  );
}
