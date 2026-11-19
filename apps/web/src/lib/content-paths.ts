export function showPath(slug: string) {
  return `/shows/${encodeURIComponent(slug)}`;
}

export function episodePath(showSlug: string, episodeSlug: string) {
  return `${showPath(showSlug)}/episodes/${encodeURIComponent(episodeSlug)}`;
}

export function youtubeThumbnail(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
}
