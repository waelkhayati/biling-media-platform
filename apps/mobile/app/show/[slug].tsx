import { useLocalSearchParams } from "expo-router";
import { api } from "../../src/api";
import { EpisodeCard } from "../../src/cards";
import { Community } from "../../src/community";
import { useResource } from "../../src/resource";
import { Artwork, Copy, Heading, Label, Screen, Status, still, Title } from "../../src/ui";
import { Video } from "../../src/video";

export default function Show() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const view = useResource(slug, () => api.show(slug));
  const item = view.data;
  return (
    <Screen refresh={view.refresh} refreshing={view.loading}>
      <Status loading={view.loading} error={view.error} retry={view.refresh} />
      {item && (
        <>
          <Artwork uri={item.posterUrl ?? still(item.episodes[0]?.youtubeVideoId)} />
          <Label>
            {[item.metadata.genre, item.metadata.releaseYear].filter(Boolean).join(" · ") ||
              "Production"}
          </Label>
          <Title>{item.title}</Title>
          {item.description && <Copy>{item.description}</Copy>}
          {item.metadata.trailerYoutubeVideoId && (
            <>
              <Heading>Trailer</Heading>
              <Video
                key={item.metadata.trailerYoutubeVideoId}
                id={item.metadata.trailerYoutubeVideoId}
              />
            </>
          )}
          <Heading>Episodes</Heading>
          {item.episodes.map((episode) => (
            <EpisodeCard key={episode.id} item={episode} />
          ))}
          {!item.episodes.length && <Copy muted>No published episodes yet.</Copy>}
          <Community key={item.id} target={{ type: "show", slug }} />
        </>
      )}
    </Screen>
  );
}
