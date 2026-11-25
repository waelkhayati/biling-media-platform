import { useFocusEffect, router } from "expo-router";
import { useCallback } from "react";
import { api } from "../../src/api";
import { EpisodeCard } from "../../src/cards";
import { useResource } from "../../src/resource";
import { useSession } from "../../src/session";
import { Action, Card, Copy, Heading, Screen, showRoute, Status, Title } from "../../src/ui";

export default function Following() {
  const { token, ready } = useSession();
  const feed = useResource(token ?? "guest", async () => {
    if (!token) return undefined;
    const shows = await api.following(token);
    const details = await Promise.allSettled(shows.slice(0, 8).map((show) => api.show(show.slug)));
    const episodes = details.flatMap((detail) =>
      detail.status === "fulfilled" ? detail.value.episodes.slice(0, 2) : [],
    );
    episodes.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    return { shows, episodes, incomplete: details.some((detail) => detail.status === "rejected") };
  });
  useFocusEffect(
    useCallback(() => {
      if (token) void feed.refresh();
    }, [token, feed.refresh]),
  );
  return (
    <Screen
      tab
      refresh={token ? feed.refresh : undefined}
      refreshing={feed.loading && feed.data !== undefined}
    >
      <Title>Following</Title>
      <Status
        skeleton="card"
        loading={!ready || (Boolean(token) && feed.loading && feed.data === undefined)}
        error={feed.error}
        retry={feed.refresh}
      />
      {ready && !token && (
        <>
          <Copy muted>Follow productions to keep their episodes close.</Copy>
          <Action label="Go to profile" onPress={() => router.push("/profile")} />
        </>
      )}
      {feed.data?.episodes.length ? (
        <>
          <Heading>Recent episodes</Heading>
          {feed.data.episodes.map((item) => (
            <EpisodeCard key={item.id} item={item} />
          ))}
        </>
      ) : null}
      {feed.data?.incomplete && (
        <Copy muted>Some episodes could not be loaded. Pull down to retry.</Copy>
      )}
      {feed.data && <Heading>Your productions</Heading>}
      {feed.data?.shows.map((show) => (
        <Card key={show.id} title={show.title} uri={show.posterUrl} href={showRoute(show.slug)} />
      ))}
      {feed.data?.shows.length === 0 && (
        <>
          <Copy muted>You haven’t followed any productions yet.</Copy>
          <Action quiet label="Explore productions" onPress={() => router.push("/explore")} />
        </>
      )}
    </Screen>
  );
}
