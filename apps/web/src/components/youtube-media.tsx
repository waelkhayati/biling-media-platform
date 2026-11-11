import Image from "next/image";

export function YouTubeMedia({
  videoId,
  title,
  className = "",
}: {
  videoId: string;
  title: string;
  className?: string;
}) {
  return (
    <a
      className={`youtube-media ${className}`.trim()}
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`Watch ${title} on YouTube (opens in a new tab)`}
    >
      <Image
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        fill
        sizes="(max-width: 600px) 90vw, (max-width: 1000px) 60vw, 45vw"
        unoptimized
      />
      <span className="youtube-play" aria-hidden="true">
        ▶
      </span>
    </a>
  );
}
