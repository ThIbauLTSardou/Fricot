import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";

import { useDishStore } from "@/store/useDishStore";
import { useWeekStore } from "@/store/useWeekStore";
import { useShoppingStore } from "@/store/useShoppingStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useCategoryStore } from "@/store/useCategoryStore";
import { useRef } from "react";
import { ThemeProvider, useTheme } from "@/lib/ThemeContext";

function AuthGate() {
  const session = useAuthStore((s) => s.session);
  const loaded = useAuthStore((s) => s.loaded);
  const groupId = useAuthStore((s) => s.groupId);
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const unsubShoppingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    useAuthStore.getState().load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const inAuth = segments[0] === "auth";
    if (!session && !inAuth) {
      router.replace("/auth/login");
    } else if (session && inAuth) {
      router.replace("/(tabs)");
    }
  }, [loaded, session, segments]);

  useEffect(() => {
    if (!session) return;

    // Nettoyer l'ancienne subscription avant d'en créer une nouvelle
    unsubShoppingRef.current?.();
    unsubShoppingRef.current = null;

    useDishStore.getState().load();
    useWeekStore.getState().load();
    useShoppingStore.getState().load();
    useCategoryStore.getState().load();

    if (groupId) {
      unsubShoppingRef.current = useShoppingStore.getState().subscribe();
    }

    return () => {
      unsubShoppingRef.current?.();
      unsubShoppingRef.current = null;
    };
  }, [groupId, session]);

  if (!loaded) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700", fontSize: 16 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="group" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Recoleta: require("../assets/fonts/Recoleta-RegularDEMO.otf"),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthGate />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
