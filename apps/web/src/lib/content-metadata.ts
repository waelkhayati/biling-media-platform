import type { Metadata } from "next";

export function siteUrl() {
  return new URL(process.env.SITE_URL ?? "https://biling-media-platform.vercel.app");
}

export function contentMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const summary = description.trim().replace(/\s+/g, " ");
  const preview = summary.length > 160 ? `${summary.slice(0, 157).trimEnd()}…` : summary;
  const previewImage = image ? { url: image } : { url: "/logo.png", alt: "Biling Media logo" };

  return {
    title,
    description: preview,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Biling Media",
      title,
      description: preview,
      url: path,
      images: [previewImage],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description: preview,
      images: [previewImage],
    },
  };
}
