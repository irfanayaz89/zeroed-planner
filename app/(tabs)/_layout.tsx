import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/constants/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name={icon} size={size} color={color} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.soft,
        tabBarLabelStyle: { fontFamily: fonts.bodyBold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.bar },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={tab("Today", "time-outline")} />
      <Tabs.Screen name="week" options={tab("Week", "calendar-outline")} />
      <Tabs.Screen name="pillars" options={tab("Pillars", "stats-chart-outline")} />
      <Tabs.Screen name="me" options={tab("Me", "person-outline")} />
    </Tabs>
  );
}
