import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { api } from "../../src/api";
import { arcadeApi } from "../../src/arcade-api";
import { GameCard } from "../../src/cards";
import { Catalog } from "../../src/catalog";
import { useResource } from "../../src/resource";
import { useSession } from "../../src/session";
import { color, Copy, Heading, Screen, Status, Title } from "../../src/ui";

export default function Games() {
  const [revision, setRevision] = useState(0);
  const { token } = useSession();
  const arcade = useResource(token ?? "guest", () => arcadeApi.list(token));
  useFocusEffect(
    useCallback(() => {
      void arcade.refresh();
    }, [arcade.refresh]),
  );
  return (
    <Screen
      tab
      refresh={() => {
        setRevision((value) => value + 1);
        void arcade.refresh();
      }}
      refreshing={arcade.loading && arcade.data !== undefined}
    >
      <Title>Biling Arcade</Title>
      <Heading>Today's puzzles</Heading>
      <Status
        skeleton="rows"
        loading={arcade.loading && arcade.data === undefined}
        error={arcade.error}
        retry={arcade.refresh}
      />
      {arcade.data?.length === 0 && <Copy muted>No daily puzzles are scheduled today.</Copy>}
      {arcade.data?.map((game) => (
        <Pressable
          key={game.slug}
          accessibilityRole="link"
          style={[
            tile.surface,
            game.kind === "MOT" && tile.mot,
            game.kind === "RECALL" && tile.recall,
          ]}
          onPress={() =>
            router.push({
              pathname: "/arcade/[slug]/[date]",
              params: { slug: game.slug, date: game.date },
            })
          }
        >
          <Text style={[tile.glyph, game.kind !== "LINKS" && tile.dark]}>
            {game.kind === "MOT" ? "A B C" : game.kind === "LINKS" ? "◆ ◆" : "0:59"}
          </Text>
          <Text style={[tile.title, game.kind !== "LINKS" && tile.dark]}>{game.title}</Text>
          <Text style={[tile.copy, game.kind !== "LINKS" && tile.dark]}>{game.description}</Text>
          <Text style={[tile.cta, game.kind !== "LINKS" && tile.dark]}>
            {game.activity === "IN_PROGRESS"
              ? "Continue"
              : game.activity
                ? "See result"
                : "Play today"}
          </Text>
        </Pressable>
      ))}
      <Heading>Quiz collection</Heading>
      <Catalog
        key={revision}
        load={api.games}
        empty="There are no active quizzes right now."
        render={(item) => <GameCard key={item.id} item={item} />}
      />
    </Screen>
  );
}

const tile = StyleSheet.create({
  surface: { padding: 16, gap: 8, backgroundColor: "#242424", minHeight: 145 },
  mot: { backgroundColor: color.lime },
  recall: { backgroundColor: color.orange },
  dark: { color: color.black },
  glyph: { fontSize: 27, fontWeight: "900", color: color.paper, letterSpacing: 4 },
  title: { fontSize: 26, fontWeight: "900", color: color.paper },
  copy: { fontSize: 16, color: color.paper },
  cta: { fontSize: 15, fontWeight: "800", color: color.paper },
});
