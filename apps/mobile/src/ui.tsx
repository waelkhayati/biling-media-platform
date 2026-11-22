import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ReactNode } from "react";

export const color = {
  black: "#090909",
  ink: "#181715",
  paper: "#F5F0E6",
  muted: "#B5AFA5",
  orange: "#FF4B0B",
  lime: "#C8FF00",
  line: "#393631",
};
// Metro registers local image assets from a static require.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const logo = require("../assets/logo.png");
export const showRoute = (slug: string): Href => ({ pathname: "/show/[slug]", params: { slug } });
export const episodeRoute = (show: string, slug: string): Href => ({
  pathname: "/episode/[show]/[slug]",
  params: { show, slug },
});
export const articleRoute = (slug: string): Href => ({
  pathname: "/article/[slug]",
  params: { slug },
});
export const gameRoute = (slug: string): Href => ({ pathname: "/play/[slug]", params: { slug } });
export const still = (id?: string) =>
  id ? "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg" : undefined;
export const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });

export function Screen({
  children,
  refresh,
  refreshing = false,
  tab = false,
}: {
  children: ReactNode;
  refresh?: () => void;
  refreshing?: boolean;
  tab?: boolean;
}) {
  return (
    <SafeAreaView
      style={styles.screen}
      edges={tab ? ["top", "left", "right"] : ["bottom", "left", "right"]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.content}
        refreshControl={
          refresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={color.lime}
              colors={[color.black]}
              progressBackgroundColor={color.lime}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
export function Title({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
export function Copy({
  children,
  muted = false,
  rtl = false,
}: {
  children: ReactNode;
  muted?: boolean;
  rtl?: boolean;
}) {
  return <Text style={[styles.copy, muted && styles.muted, rtl && styles.rtl]}>{children}</Text>;
}
export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}
export function Action({
  label,
  onPress,
  quiet = false,
  disabled = false,
  selected,
}: {
  label: string;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        quiet && styles.quiet,
        (pressed || disabled) && styles.dim,
      ]}
    >
      <Text style={[styles.buttonText, quiet && styles.quietText]}>{label}</Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={color.muted}
        style={styles.field}
      />
    </View>
  );
}
export function Status({
  loading,
  error,
  retry,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
}) {
  if (error)
    return (
      <View accessibilityLiveRegion="polite" style={styles.panel}>
        <Copy>{error}</Copy>
        {retry && <Action quiet label="Try again" onPress={retry} />}
      </View>
    );
  if (loading)
    return (
      <ActivityIndicator accessibilityLabel="Loading" color={color.lime} style={styles.spinner} />
    );
  return null;
}
export function Artwork({
  uri,
  alt,
  ratio = 16 / 9,
}: {
  uri?: string | null;
  alt?: string | null;
  ratio?: number;
}) {
  return (
    <View style={[styles.art, { aspectRatio: ratio }]}>
      {uri ? (
        <Image
          source={uri}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={StyleSheet.absoluteFill}
          accessible={!!alt}
          accessibilityLabel={alt ?? undefined}
        />
      ) : (
        <View style={styles.artAccent} />
      )}
    </View>
  );
}
export function Card({
  title,
  meta,
  uri,
  href,
  hero = false,
}: {
  title: string;
  meta?: string;
  uri?: string | null;
  href: Href;
  hero?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={meta ? title + ", " + meta : title}
      onPress={() => router.push(href)}
      style={({ pressed }) => [styles.card, hero && styles.hero, pressed && styles.dim]}
    >
      {(uri || hero) && <Artwork uri={uri} ratio={hero ? 1.35 : 1.85} />}
      <View style={styles.cardCopy}>
        {meta && <Label>{meta}</Label>}
        <Text style={[styles.cardTitle, hero && styles.heroTitle]}>{title}</Text>
      </View>
    </Pressable>
  );
}
export function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {children}
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.black },
  content: { paddingHorizontal: 18, paddingVertical: 16, gap: 16 },
  title: { color: color.paper, fontWeight: "900", fontSize: 38, letterSpacing: -1.6 },
  heading: { color: color.paper, fontWeight: "800", fontSize: 24, letterSpacing: -0.55 },
  copy: { color: color.paper, fontSize: 17, lineHeight: 26, textAlign: "auto" },
  muted: { color: color.muted },
  rtl: { writingDirection: "rtl", textAlign: "right" },
  label: {
    color: color.lime,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    backgroundColor: color.lime,
    borderRadius: 7,
  },
  quiet: { backgroundColor: color.ink, borderWidth: 1, borderColor: color.line },
  dim: { opacity: 0.68 },
  buttonText: { color: color.black, fontWeight: "800", fontSize: 16, textAlign: "center" },
  quietText: { color: color.paper },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: color.muted, fontWeight: "700" },
  field: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: color.line,
    color: color.paper,
    backgroundColor: color.ink,
    fontSize: 16,
    textAlign: "auto",
  },
  panel: { gap: 8, padding: 14, backgroundColor: color.ink, borderRadius: 7 },
  spinner: { padding: 24 },
  art: { overflow: "hidden", backgroundColor: "#251711", justifyContent: "flex-end" },
  artAccent: { backgroundColor: color.orange, height: 8, width: "37%" },
  card: { backgroundColor: color.ink, borderRadius: 7, overflow: "hidden" },
  hero: { borderBottomWidth: 4, borderBottomColor: color.orange },
  cardCopy: { padding: 13, minHeight: 48, justifyContent: "center", gap: 5 },
  cardTitle: { color: color.paper, fontWeight: "800", fontSize: 17 },
  heroTitle: { fontSize: 27 },
  rail: { gap: 12 },
  stack: { gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
