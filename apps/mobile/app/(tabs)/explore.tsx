import { useState } from "react";
import { View } from "react-native";
import { contentQuerySchema } from "@biling/schemas";
import { api } from "../../src/api";
import { ArticleCard, EpisodeCard, GameCard, ShowCard } from "../../src/cards";
import { Catalog } from "../../src/catalog";
import { useResource } from "../../src/resource";
import { Action, Copy, Field, Heading, Screen, Status, styles, Title } from "../../src/ui";

const sections = ["Productions", "Stories", "Games"] as const;
export default function Explore() {
  const [section, setSection] = useState<(typeof sections)[number]>("Productions");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [searchRevision, setSearchRevision] = useState(0);
  const [error, setError] = useState<string>();
  const shows = useResource("shows", api.shows);
  const search = useResource(query, () => (query ? api.search(query) : Promise.resolve(undefined)));
  function submit() {
    const parsed = contentQuerySchema.safeParse(input);
    if (!parsed.success) {
      setError("Enter 2–100 characters.");
      return;
    }
    setError(undefined);
    if (parsed.data === query) {
      void search.refresh();
      setSearchRevision((value) => value + 1);
    } else setQuery(parsed.data);
  }
  const result = search.data;
  return (
    <Screen tab>
      <Title>Explore</Title>
      <Field
        label="Search shows, episodes, stories and games"
        value={input}
        onChangeText={setInput}
        onSubmitEditing={submit}
        returnKeyType="search"
        maxLength={100}
      />
      <View style={styles.row}>
        <Action label="Search" onPress={submit} />
        {!!(query || input) && (
          <Action
            quiet
            label="Clear"
            onPress={() => {
              setInput("");
              setQuery("");
              setError(undefined);
            }}
          />
        )}
      </View>
      <Status error={error} />
      {query ? (
        <>
          <Status
            skeleton="rows"
            loading={search.loading && search.data === undefined}
            error={search.error}
            retry={search.refresh}
          />
          {result && (
            <>
              {!result.shows.length && !result.episodes.length && !result.articles.length && (
                <Copy muted>No shows, episodes or stories match “{query}”.</Copy>
              )}
              {!!result.shows.length && <Heading>Productions</Heading>}
              {result.shows.map((item) => (
                <ShowCard key={item.id} item={item} />
              ))}
              {!!result.episodes.length && <Heading>Episodes</Heading>}
              {result.episodes.map((item) => (
                <EpisodeCard key={item.id} item={item} />
              ))}
              {!!result.articles.length && <Heading>Stories</Heading>}
              {result.articles.map((item) => (
                <ArticleCard key={item.id} item={item} />
              ))}
              {Object.values(result.hasMore).some(Boolean) && (
                <Copy muted>Refine your search to see other matches.</Copy>
              )}
            </>
          )}
          <Heading>Games</Heading>
          <Catalog
            key={query + searchRevision}
            load={(page) => api.games(page, query)}
            empty="No active games match your search."
            render={(item) => <GameCard key={item.id} item={item} />}
          />
        </>
      ) : (
        <>
          <View style={styles.row}>
            {sections.map((item) => (
              <Action
                key={item}
                selected={section === item}
                quiet={section !== item}
                label={item}
                onPress={() => setSection(item)}
              />
            ))}
          </View>
          {section === "Productions" && (
            <>
              <Status
                skeleton="card"
                loading={shows.loading && shows.data === undefined}
                error={shows.error}
                retry={shows.refresh}
              />
              {shows.data?.map((item) => (
                <ShowCard key={item.id} item={item} />
              ))}
              {shows.data?.length === 0 && <Copy muted>No productions yet.</Copy>}
            </>
          )}
          {section === "Stories" && (
            <Catalog
              load={api.articles}
              empty="No published stories yet."
              render={(item) => <ArticleCard key={item.id} item={item} />}
            />
          )}
          {section === "Games" && (
            <Catalog
              load={api.games}
              empty="No active games right now."
              render={(item) => <GameCard key={item.id} item={item} />}
            />
          )}
        </>
      )}
    </Screen>
  );
}
