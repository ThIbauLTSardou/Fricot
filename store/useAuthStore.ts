import { create } from "zustand";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

type AuthStore = {
  session: Session | null;
  user: User | null;
  groupId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  setGroupId: (id: string | null) => void;
  refreshGroupId: (userId: string) => Promise<void>;
};

// Récupère le groupe actuel de l'utilisateur — null si aucun
async function fetchGroupId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", userId)
    .limit(1)
    .single();
  return data?.group_id ?? null;
}

// Migration one-shot des données AsyncStorage vers Supabase
async function migrateLocalData() {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const migrated = await AsyncStorage.getItem("menus:migrated");
    if (migrated) return;

    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return;

    const [dishesRaw, weekRaw, shoppingRaw] = await Promise.all([
      AsyncStorage.getItem("menus:dishes"),
      AsyncStorage.getItem("menus:week"),
      AsyncStorage.getItem("menus:shopping"),
    ]);

    if (dishesRaw) {
      const dishes = JSON.parse(dishesRaw) as Array<{
        id: string; name: string; imageUri?: string; servings: number; ingredients: unknown;
      }>;
      if (dishes.length > 0) {
        await supabase.from("dishes").insert(
          dishes.map((d) => ({
            id: d.id,
            group_id: null,
            created_by: userId,
            name: d.name,
            image_uri: d.imageUri ?? null,
            servings: d.servings,
            ingredients: d.ingredients as never,
          }))
        );
      }
    }

    if (weekRaw) {
      const plan = JSON.parse(weekRaw);
      await supabase
        .from("week_plans")
        .upsert({ group_id: null, plan }, { onConflict: "group_id" });
    }

    if (shoppingRaw) {
      const items = JSON.parse(shoppingRaw) as Array<{
        id: string; label: string; checked: boolean; manual: boolean;
      }>;
      if (items.length > 0) {
        await supabase.from("shopping_items").insert(
          items.map((item, i) => ({
            id: item.id,
            group_id: null,
            label: item.label,
            checked: item.checked,
            manual: item.manual,
            position: i,
          }))
        );
      }
    }

    await AsyncStorage.multiRemove(["menus:dishes", "menus:week", "menus:shopping"]);
    await AsyncStorage.setItem("menus:migrated", "1");
  } catch (e) {
    console.warn("Migration locale ignorée :", e);
  }
}

// Extrait les tokens depuis le fragment (#) ou les query params (?),
// selon le flow Supabase (PKCE met les tokens dans le fragment).
async function exchangeOAuthCallback(callbackUrl: string): Promise<void> {
  const url = new URL(callbackUrl);

  // PKCE flow : tokens dans le fragment (#access_token=...&refresh_token=...)
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = fragment.get("access_token") ?? url.searchParams.get("access_token");
  const refreshToken = fragment.get("refresh_token") ?? url.searchParams.get("refresh_token");

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  } else {
    // Flow code (PKCE avec code_verifier) — laisser Supabase gérer l'échange
    const { error } = await supabase.auth.exchangeCodeForSession(url.searchParams.get("code") ?? "");
    if (error) throw error;
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  groupId: null,
  loaded: false,

  load: async () => {
    if (get().loaded) return;

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      set({ session: newSession, user: newSession?.user ?? null });
      if (newSession?.user) {
        const groupId = await fetchGroupId(newSession.user.id);
        set({ groupId });
      } else {
        set({ groupId: null });
      }
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const groupId = await fetchGroupId(session.user.id);
      await migrateLocalData();
      set({ session, user: session.user, groupId, loaded: true });
    } else {
      set({ session: null, user: null, groupId: null, loaded: true });
    }
  },

  refreshGroupId: async (userId: string) => {
    const groupId = await fetchGroupId(userId);
    set({ groupId });
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUpWithEmail: async (email, password, displayName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: displayName ?? email.split("@")[0] } },
    });
    if (error) throw error;
  },

  signInWithGoogle: async () => {
    const redirectTo = makeRedirectUri({ scheme: "menusapp", path: "auth/callback" });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success" && result.url) {
        await exchangeOAuthCallback(result.url);
      }
    }
  },

  signInWithApple: async () => {
    const redirectTo = makeRedirectUri({ scheme: "menusapp", path: "auth/callback" });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === "success" && result.url) {
        await exchangeOAuthCallback(result.url);
      }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, groupId: null });
  },

  setGroupId: (id) => set({ groupId: id }),
}));
