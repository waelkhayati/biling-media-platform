import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import { LaunchSplash } from "../src/launch-splash";
import { SessionProvider } from "../src/session";
import { color } from "../src/ui";

export default function RootLayout() {
  const [reduceMotion, setReduceMotion] = useState<boolean>();
  const [splashVisible, setSplashVisible] = useState(true);
  const finishSplash = useCallback(() => setSplashVisible(false), []);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => listener.remove();
  }, []);
  return (
    <SessionProvider>
      <StatusBar style={splashVisible ? "dark" : "light"} />
      <View
        style={{ flex: 1 }}
        accessibilityElementsHidden={splashVisible}
        importantForAccessibility={splashVisible ? "no-hide-descendants" : "auto"}
      >
        <Stack
          screenOptions={{
            headerTintColor: color.paper,
            headerStyle: { backgroundColor: color.black },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: color.black },
            headerBackButtonDisplayMode: "minimal",
            animation: reduceMotion ? "none" : "default",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="show/[slug]" options={{ title: "Production" }} />
          <Stack.Screen name="episode/[show]/[slug]" options={{ title: "Episode" }} />
          <Stack.Screen name="article/[slug]" options={{ title: "Story" }} />
          <Stack.Screen name="play/[slug]" options={{ title: "Biling Games" }} />
          <Stack.Screen name="arcade/[slug]/[date]" options={{ title: "Biling Arcade" }} />
        </Stack>
      </View>
      {splashVisible && <LaunchSplash reduceMotion={reduceMotion} onFinish={finishSplash} />}
    </SessionProvider>
  );
}
