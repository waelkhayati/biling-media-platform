import { youtubeWatchUrl } from "@/lib/content-paths";

export function YouTubePlayer({
  videoId,
  title,
  lazy = false,
}: {
  videoId?: string;
  title: string;
  lazy?: boolean;
}) {
  if (!videoId) {
    return (
      <div className="player-unavailable">
        <p>This episode is currently unavailable to watch.</p>
      </div>
    );
  }

  return (
    <>
      <iframe
        className="detail-player"
        loading={lazy ? "lazy" : undefined}
        title={`YouTube player for ${title}`}
        src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`}
        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <a
        className="detail-external-link"
        href={youtubeWatchUrl(videoId)}
        target="_blank"
        rel="noopener"
      >
        Open on YouTube <span aria-hidden="true">↗</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </>
  );
}
