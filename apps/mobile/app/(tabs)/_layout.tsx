import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { color } from "../../src/ui";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.lime,
        tabBarInactiveTintColor: color.muted,
        tabBarStyle: { backgroundColor: color.black, borderTopColor: color.line },
        tabBarLabelStyle: { fontWeight: "700" },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name="home-outline" color={focused ? color.lime : color.muted} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="search-outline"
              color={focused ? color.lime : color.muted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: "Games",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="game-controller-outline"
              color={focused ? color.lime : color.muted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="following"
        options={{
          title: "Following",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="bookmark-outline"
              color={focused ? color.lime : color.muted}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons
              name="person-circle-outline"
              color={focused ? color.lime : color.muted}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
