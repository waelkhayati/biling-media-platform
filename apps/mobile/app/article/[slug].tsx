import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Share, Text, View } from "react-native";
import { articleInline } from "@biling/schemas";
import type { ArticleBlock } from "@biling/contracts";
import { api, segment } from "../../src/api";
import { ArticleCard } from "../../src/cards";
import { Community } from "../../src/community";
import { useResource } from "../../src/resource";
import {
  Action,
  Artwork,
  Card,
  color,
  Copy,
  dateLabel,
  episodeRoute,
  Heading,
  Label,
  Screen,
  showRoute,
  Status,
  styles,
} from "../../src/ui";
import { Video } from "../../src/video";

function Inline({ text }: { text: string }) {
  return articleInline(text).map((part, index) => {
    if (part.type === "link") {
      return (
        <Text
          key={index}
          accessibilityRole="link"
          style={{ color: color.lime, textDecorationLine: "underline" }}
          onPress={() => {
            void Linking.openURL(part.href).catch(() => {});
          }}
        >
          {part.text}
        </Text>
      );
    }
    return (
      <Text
        key={index}
        style={
          part.type === "bold"
            ? { fontWeight: "700" }
            : part.type === "italic"
              ? { fontStyle: "italic" }
              : undefined
        }
      >
        {part.text}
      </Text>
    );
  });
}

function Block({ block, rtl }: { block: ArticleBlock; rtl: boolean }) {
  switch (block.type) {
    case "paragraph":
      return (
        <Copy rtl={rtl}>
          <Inline text={block.text} />
        </Copy>
      );
    case "heading":
      return (
        <Text accessibilityRole="header" style={[styles.heading, rtl && styles.rtl]}>
          <Inline text={block.text} />
        </Text>
      );
    case "quote":
      return (
        <View style={{ borderStartWidth: 3, borderStartColor: color.orange, paddingStart: 14 }}>
          <Copy rtl={rtl}>
            <Inline text={block.text} />
          </Copy>
        </View>
      );
    case "ordered":
    case "unordered":
      return (
        <View style={styles.stack}>
          {block.items.map((item, index) => (
            <Copy key={index} rtl={rtl}>
              {block.type === "ordered" ? index + 1 + "." : "•"} <Inline text={item} />
            </Copy>
          ))}
        </View>
      );
    case "image":
      return (
        <>
          <Artwork uri={block.url} alt={block.alt} />
          {block.credit && (
            <Copy muted rtl={rtl}>
              {block.credit}
            </Copy>
          )}
        </>
      );
    case "youtube":
      return <Video id={block.videoId} />;
  }
}

export default function Article() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const view = useResource(slug, () => api.article(slug));
  const [error, setError] = useState<string>();
  const item = view.data;
  const rtl = item?.language === "ar";
  async function share() {
    if (!item) return;
    setError(undefined);
    const site = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/+$/, "");
    const url = site?.startsWith("https://") ? site + "/articles/" + segment(slug) : undefined;
    try {
      await Share.share({
        title: item.title,
        message: [item.title, url ?? item.excerpt ?? item.author].join("\n"),
      });
    } catch {
      setError("Could not open sharing.");
    }
  }
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
          <Label>{item.category}</Label>
          <Text accessibilityRole="header" style={[styles.title, rtl && styles.rtl]}>
            {item.title}
          </Text>
          {item.excerpt && <Copy rtl={rtl}>{item.excerpt}</Copy>}
          <Copy muted rtl={rtl}>
            {item.author} · {dateLabel(item.publishedAt)}
          </Copy>
          {item.imageUrl && <Artwork uri={item.imageUrl} alt={item.imageAlt} />}
          {(item.imageCaption || item.imageCredit) && (
            <Copy muted rtl={rtl}>
              {[item.imageCaption, item.imageCredit].filter(Boolean).join(" · ")}
            </Copy>
          )}
          {item.body.map((block, index) => (
            <Block block={block} key={index} rtl={rtl} />
          ))}
          <Action quiet label="Share story" onPress={share} />
          <Status error={error} />
          {!!item.related.length && <Heading>More stories</Heading>}
          {item.related.map((article) => (
            <ArticleCard key={article.id} item={article} />
          ))}
          {item.shows.map((show) => (
            <Card
              key={show.slug}
              title={show.title}
              meta="Production"
              href={showRoute(show.slug)}
            />
          ))}
          {item.episodes.map((episode) => (
            <Card
              key={episode.showSlug + "/" + episode.slug}
              title={episode.title}
              meta="Episode"
              href={episodeRoute(episode.showSlug, episode.slug)}
            />
          ))}
          <Community key={item.id} target={{ type: "article", slug }} />
        </>
      )}
    </Screen>
  );
}
