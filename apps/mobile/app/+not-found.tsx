import { router } from "expo-router";
import { Action, Copy, Screen, Title } from "../src/ui";

export default function NotFound() {
  return (
    <Screen>
      <Title>Page unavailable</Title>
      <Copy muted>This link does not match a Biling screen.</Copy>
      <Action label="Go home" onPress={() => router.replace("/")} />
    </Screen>
  );
}
