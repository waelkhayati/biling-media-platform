import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { youtubeVideoIdSchema } from "@biling/schemas";
import { api } from "../../src/api";
import { ArticleCard, EpisodeCard, GameCard, ShowCard } from "../../src/cards";
import { useResource } from "../../src/resource";
import { useSession } from "../../src/session";
import {
  Action,
  Card,
  color,
  Copy,
  Heading,
  Label,
  logo,
  Rail,
  Screen,
  showRoute,
  Status,
  styles,
} from "../../src/ui";
import { Video } from "../../src/video";

const broadcast = youtubeVideoIdSchema.safeParse(process.env.EXPO_PUBLIC_LIVE_YOUTUBE_ID);

export default function Home() {
  const { token } = useSession();
  const shows = useResource("shows", api.shows);
  const episodes = useResource("episodes", api.episodes);
  const articles = useResource("articles", () => api.articles());
  const games = useResource("games", () => api.games());
  const following = useResource(token ?? "guest", () =>
    token ? api.following(token) : Promise.resolve([]),
  );
  const featured = shows.data?.find((show) => show.featured) ?? shows.data?.[0];
  const challenge =
    games.data?.items.find((game) => game.type === "DAILY_CHALLENGE") ?? games.data?.items[0];
  const refresh = () => {
    void Promise.all([
      shows.refresh(),
      episodes.refresh(),
      articles.refresh(),
      games.refresh(),
      following.refresh(),
    ]);
  };
  return (
    <Screen
      tab
      refresh={refresh}
      refreshing={[shows, episodes, articles, games, following].some(
        (resource) => resource.loading && resource.data !== undefined,
      )}
    >
      <View style={homeStyles.brand}>
        <View style={homeStyles.logoTile}>
          <Image
            source={logo}
            style={homeStyles.logo}
            contentFit="contain"
            accessible
            accessibilityLabel="Biling Media"
          />
        </View>
        <Text style={homeStyles.tagline}>In art we trust.</Text>
      </View>
      <View style={[styles.panel, homeStyles.broadcast]}>
        <View style={homeStyles.broadcastHeader}>
          <Ionicons name="radio-outline" size={23} color={color.orange} />
          <Heading>Live</Heading>
          <Label>{broadcast.success ? "Broadcast" : "Off air"}</Label>
        </View>
        {broadcast.success ? (
          <Video id={broadcast.data} />
        ) : (
          <Copy muted>Check here for the next Biling broadcast.</Copy>
        )}
      </View>
      <Status
        skeleton="hero"
        loading={shows.loading && shows.data === undefined}
        error={shows.error}
        retry={shows.refresh}
      />
      {featured && <ShowCard item={featured} hero />}
      {shows.data?.length === 0 && <Copy muted>Published productions will appear here.</Copy>}
      <Heading>Latest episodes</Heading>
      <Status
        skeleton="rail"
        loading={episodes.loading && episodes.data === undefined}
        error={episodes.error}
        retry={episodes.refresh}
      />
      {episodes.data?.length ? (
        <Rail>
          {episodes.data.slice(0, 8).map((item) => (
            <View key={item.id} style={{ width: 228 }}>
              <EpisodeCard item={item} />
            </View>
          ))}
        </Rail>
      ) : (
        episodes.data && <Copy muted>No episodes yet.</Copy>
      )}
      <Heading>Stories</Heading>
      <Status
        skeleton="card"
        loading={articles.loading && articles.data === undefined}
        error={articles.error}
        retry={articles.refresh}
      />
      {articles.data?.items.slice(0, 3).map((item) => (
        <ArticleCard key={item.id} item={item} />
      ))}
      {articles.data?.items.length === 0 && <Copy muted>No stories yet.</Copy>}
      <Heading>Biling Games</Heading>
      <Status
        skeleton="rows"
        loading={games.loading && games.data === undefined}
        error={games.error}
        retry={games.refresh}
      />
      {challenge && <GameCard item={challenge} />}
      <Action quiet label="Browse games" onPress={() => router.push("/games")} />
      {!!following.data?.length && (
        <>
          <Heading>From your follows</Heading>
          {following.data.slice(0, 3).map((show) => (
            <Card
              key={show.id}
              title={show.title}
              uri={show.posterUrl}
              href={showRoute(show.slug)}
            />
          ))}
        </>
      )}
    </Screen>
  );
}

const homeStyles = StyleSheet.create({
  brand: { flexDirection: "row", alignItems: "center", gap: 14 },
  logoTile: { width: 54, height: 54, padding: 5, backgroundColor: color.orange },
  logo: { width: "100%", height: "100%" },
  tagline: { flex: 1, color: color.paper, fontSize: 25, fontWeight: "900", letterSpacing: -0.7 },
  broadcast: { borderStartWidth: 3, borderStartColor: color.orange },
  broadcastHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 },
});
