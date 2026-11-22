import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AudienceLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <SiteHeader />
      <main className="audience-main page-gutter" id="main">
        {children}
      </main>
    </>
  );
}
