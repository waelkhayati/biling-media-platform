import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteUrl } from "@/lib/content-metadata";
import "./globals.css";
import "./articles/editorial.css";
import "./shows/detail.css";
import "./discovery.css";
import "./audience.css";
import "./community.css";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: {
    default: "Biling Media — In Art We Trust",
    template: "%s | Biling",
  },
  description:
    "In art we trust. Discover independent Tunisian media, live broadcasting, and original productions from Biling Media.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
