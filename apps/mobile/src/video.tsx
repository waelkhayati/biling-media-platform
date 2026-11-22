import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { youtubeVideoIdSchema } from "@biling/schemas";
import { Action, Artwork, color, Copy, Status, still, styles } from "./ui";

const origin = "https://com.bilingmedia.app";

export function Video({ id }: { id?: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const { width } = useWindowDimensions();
  useFocusEffect(useCallback(() => () => setPlaying(false), []));
  useEffect(() => {
    if (!playing || !loading) return;
    const timer = setTimeout(() => {
      setPlaying(false);
      setError("The YouTube player timed out.");
    }, 15000);
    return () => clearTimeout(timer);
  }, [playing, loading]);
  const parsed = youtubeVideoIdSchema.safeParse(id);
  if (!parsed.success) return <Copy muted>Video unavailable.</Copy>;
  const video = parsed.data;
  const watch = "https://www.youtube.com/watch?v=" + video;
  const html = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="strict-origin-when-cross-origin"><style>html,body,#player{margin:0;width:100%;height:100%;background:#090909}</style><div id="player"></div><script>
  function send(value){window.ReactNativeWebView.postMessage(value)}
  function onYouTubeIframeAPIReady(){new YT.Player('player',{videoId:'${video}',playerVars:{origin:'${origin}',playsinline:1},events:{onReady:function(){send('ready')},onError:function(){send('error')}}})}
  </script><script src="https://www.youtube.com/iframe_api" onerror="send('error')"></script>`;
  return (
    <View style={styles.stack}>
      {playing && (
        <View
          style={{ height: Math.max(200, ((width - 36) * 9) / 16), backgroundColor: color.black }}
        >
          <WebView
            source={{ html, baseUrl: origin + "/" }}
            originWhitelist={["*"]}
            accessibilityLabel="YouTube player"
            allowsInlineMediaPlayback
            allowsFullscreenVideo
            onShouldStartLoadWithRequest={(event) =>
              !event.isTopFrame || event.url === "about:blank" || event.url === origin + "/"
            }
            onError={() => {
              setPlaying(false);
              setError("The embedded player could not load.");
            }}
            onMessage={({ nativeEvent }) => {
              if (nativeEvent.data === "ready") setLoading(false);
              if (nativeEvent.data === "error") {
                setPlaying(false);
                setError("This video could not play here.");
              }
            }}
          />
        </View>
      )}
      {!playing && (
        <>
          <Artwork uri={still(video)} />
          <Action
            label="Load YouTube player"
            onPress={() => {
              setPlaying(true);
              setLoading(true);
              setError(undefined);
            }}
          />
        </>
      )}
      <Status loading={playing && loading} error={error} />
      <Action
        quiet
        label="Open in YouTube"
        onPress={() => {
          void Linking.openURL(watch).catch(() => setError("Unable to open YouTube."));
        }}
      />
    </View>
  );
}
