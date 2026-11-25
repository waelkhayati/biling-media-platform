import Image from "next/image";
import { youtubeThumbnail } from "@/lib/content-paths";
import { ContentLink } from "./content-link";

export function YouTubeMedia({
  videoId,
  title,
  href,
  className = "",
  eager = false,
}: {
  videoId: string;
  title: string;
  href: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <ContentLink className={`youtube-media ${className}`.trim()} href={href} aria-label={title}>
      <Image
        src={youtubeThumbnail(videoId)}
        alt=""
        fill
        sizes="(max-width: 600px) 90vw, (max-width: 1000px) 60vw, 45vw"
        unoptimized
        loading={eager ? "eager" : "lazy"}
      />
      <span className="youtube-play" aria-hidden="true">
        ▶
      </span>
    </ContentLink>
  );
}
