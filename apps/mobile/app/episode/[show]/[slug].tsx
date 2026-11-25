import { useLocalSearchParams } from "expo-router";
import { api } from "../../../src/api";
import { EpisodeCard } from "../../../src/cards";
import { Community } from "../../../src/community";
import { useResource } from "../../../src/resource";
import {
  Card,
  Copy,
  dateLabel,
  Heading,
  Label,
  Screen,
  showRoute,
  Status,
  Title,
} from "../../../src/ui";
import { Video } from "../../../src/video";

export default function Episode() {
  const { slug, show } = useLocalSearchParams<{ slug: string; show: string }>();
  const view = useResource(show + "/" + slug, () => api.episode(show, slug));
  const item = view.data;
  return (
    <Screen refresh={view.refresh} refreshing={view.loading && view.data !== undefined}>
      <Status
        skeleton="detail"
        loading={view.loading && view.data === undefined}
        error={view.error}
        retry={view.refresh}
      />
      {item && (
        <>
          <Label>
            {item.show.title} · {dateLabel(item.episode.publishedAt)}
          </Label>
          <Title>{item.episode.title}</Title>
          <Video key={item.episode.id} id={item.episode.youtubeVideoId} />
          {item.episode.description && <Copy>{item.episode.description}</Copy>}
          <Card title={item.show.title} meta="View production" href={showRoute(show)} />
          {!!item.relatedEpisodes.length && <Heading>More episodes</Heading>}
          {item.relatedEpisodes.map((episode) => (
            <EpisodeCard key={episode.id} item={episode} />
          ))}
          <Community key={item.episode.id} target={{ type: "episode", showSlug: show, slug }} />
        </>
      )}
    </Screen>
  );
}
