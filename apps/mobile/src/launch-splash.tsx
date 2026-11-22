import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { color, logo } from "./ui";

// The lettering is rendered from Impact into a PNG so it looks the same on both platforms.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const wordmark = require("../assets/splash-wordmark.png");
const bugWidth = 124;
const bugHeight = (bugWidth * 802) / 744;
const antennaCut = bugHeight * 0.245;

void SplashScreen.preventAutoHideAsync().catch(() => {});

export function LaunchSplash({
  reduceMotion,
  onFinish,
}: {
  reduceMotion: boolean | undefined;
  onFinish: () => void;
}) {
  const [laidOut, setLaidOut] = useState(false);
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!laidOut) return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [laidOut]);

  useEffect(() => {
    if (!laidOut || reduceMotion === undefined) return;
    if (reduceMotion) {
      const timer = setTimeout(onFinish, 250);
      return () => clearTimeout(timer);
    }
    motion.setValue(0);
    const twitch = Animated.timing(motion, {
      toValue: 1,
      duration: 850,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    twitch.start(({ finished }) => {
      if (finished) onFinish();
    });
    return () => twitch.stop();
  }, [laidOut, motion, onFinish, reduceMotion]);

  const left = motion.interpolate({
    inputRange: [0, 0.18, 0.25, 0.32, 0.39, 1],
    outputRange: ["0deg", "0deg", "8deg", "-3deg", "0deg", "0deg"],
  });
  const right = motion.interpolate({
    inputRange: [0, 0.33, 0.4, 0.48, 0.56, 1],
    outputRange: ["0deg", "0deg", "-8deg", "3deg", "0deg", "0deg"],
  });

  return (
    <View
      style={styles.splash}
      onLayout={() => setLaidOut(true)}
      accessible
      accessibilityLabel="Biling"
    >
      <View style={styles.bug} importantForAccessibility="no-hide-descendants">
        <Image source={logo} contentFit="contain" style={StyleSheet.absoluteFill} />
        {!reduceMotion && (
          <>
            <View style={styles.antennaMask} />
            <Animated.View
              style={[styles.antenna, styles.leftAntenna, { transform: [{ rotate: left }] }]}
            >
              <Image source={logo} contentFit="contain" style={styles.antennaImage} />
            </Animated.View>
            <Animated.View
              style={[styles.antenna, styles.rightAntenna, { transform: [{ rotate: right }] }]}
            >
              <Image
                source={logo}
                contentFit="contain"
                style={[styles.antennaImage, { left: -bugWidth / 2 }]}
              />
            </Animated.View>
          </>
        )}
      </View>
      <Image source={wordmark} contentFit="contain" style={styles.wordmark} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: color.orange,
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
    zIndex: 10,
  },
  bug: { width: bugWidth, height: bugHeight },
  antennaMask: {
    position: "absolute",
    top: 0,
    width: bugWidth,
    height: antennaCut,
    backgroundColor: color.orange,
  },
  antenna: {
    position: "absolute",
    top: 0,
    width: bugWidth / 2,
    height: antennaCut + 1,
    overflow: "hidden",
  },
  leftAntenna: { left: 0, transformOrigin: "89% 100%" },
  rightAntenna: { right: 0, transformOrigin: "11% 100%" },
  antennaImage: { position: "absolute", top: 0, left: 0, width: bugWidth, height: bugHeight },
  wordmark: { width: 149, aspectRatio: 389 / 124 },
});
