import { Stack } from "expo-router";
import { useTheme } from "@/lib/ThemeContext";

export default function GroupLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700", fontSize: 16 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="manage" options={{ title: "Mon groupe", presentation: "modal" }} />
      <Stack.Screen name="join" options={{ title: "Rejoindre un groupe" }} />
    </Stack>
  );
}
