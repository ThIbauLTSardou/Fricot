import { Pressable, StyleSheet, View } from "react-native";
import { Tabs, router } from "expo-router";
import { Octicons, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { radius } from "@/lib/theme";

function HeaderRight() {
  const { isDark, toggle, colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Pressable onPress={() => router.push("/group/manage")} style={{ paddingHorizontal: 12 }} hitSlop={8}>
        <Ionicons name="people" size={20} color={colors.text} />
      </Pressable>
      <Pressable onPress={toggle} style={{ paddingHorizontal: 12 }} hitSlop={8}>
        <Ionicons name={isDark ? "sunny" : "moon"} size={20} color={colors.text} />
      </Pressable>
    </View>
  );
}

type TabIconProps = { name: React.ComponentProps<typeof Octicons>["name"]; color: string | any; focused: boolean };

function TabIcon({ name, color, focused }: TabIconProps) {
  const { colors } = useTheme();
  return (
    <View style={[s.iconWrap, focused && { backgroundColor: colors.primary + "20" }]}>
      <Octicons name={name} size={21} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSubtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", letterSpacing: 0.2 },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontWeight: "700", fontSize: 16, color: colors.text },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? "home-fill" : "home"} color={color} focused={focused} />
          ),
          headerRight: () => <HeaderRight />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: "Mes plats",
          tabBarIcon: ({ color, focused }) => (
            <View style={[s.iconWrap, focused && { backgroundColor: (color as string) + "20" }]}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={21} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explorer",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="search" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "Semaine",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shopping"
        options={{
          title: "Courses",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="checklist" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dish/new"
        options={{
          title: "Nouveau plat",
          href: null,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 12 }} hitSlop={8}>
              <Ionicons name="close" size={22} color={useTheme().colors.text} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="dish/[id]"
        options={{
          title: "Modifier le plat",
          href: null,
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
