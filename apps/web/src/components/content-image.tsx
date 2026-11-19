"use client";

import Image from "next/image";
import { useState } from "react";
import { MediaPlaceholder } from "./editorial-ui";

export function ContentImage({
  src,
  title,
  fallbackLabel,
  sizes,
  alt = "",
  eager = false,
}: {
  src?: string;
  title: string;
  fallbackLabel: string;
  sizes: string;
  alt?: string;
  eager?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();

  if (!src || failedSrc === src) {
    return <MediaPlaceholder title={title} label={fallbackLabel} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      unoptimized
      loading={eager ? "eager" : "lazy"}
      onError={() => setFailedSrc(src)}
    />
  );
}
