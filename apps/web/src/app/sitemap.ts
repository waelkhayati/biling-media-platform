import type { MetadataRoute } from "next";
import { getArticleSitemap } from "@/lib/content-api";
import { siteUrl } from "@/lib/content-metadata";
import { articleHref } from "@/components/editorial-articles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const entries: MetadataRoute.Sitemap = ["/", "/shows", "/articles"].map((path) => ({
    url: new URL(path, origin).href,
  }));
  const articles = await getArticleSitemap();
  entries.push(
    ...articles.map((article) => ({
      url: new URL(articleHref(article.slug), origin).href,
      lastModified: article.updatedAt,
    })),
  );
  return entries;
}
