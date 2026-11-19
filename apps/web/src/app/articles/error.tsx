"use client";

import ContentError from "@/components/content-error";
import { SiteHeader } from "@/components/site-header";

export default function ArticlesError() {
  return (
    <>
      <SiteHeader onDiscovery={false} />
      <main className="detail-main">
        <ContentError />
      </main>
    </>
  );
}
