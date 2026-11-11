import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
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
