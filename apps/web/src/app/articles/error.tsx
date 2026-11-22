"use client";

import ContentError from "@/components/content-error";
import { SiteHeaderFrame } from "@/components/site-header-frame";

export default function ArticlesError() {
  return (
    <>
      <SiteHeaderFrame />
      <main className="detail-main">
        <ContentError />
      </main>
    </>
  );
}
