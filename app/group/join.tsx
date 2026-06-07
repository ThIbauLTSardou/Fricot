import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { spacing, radius } from "@/lib/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { useDishStore } from "@/store/useDishStore";
import { useWeekStore } from "@/store/useWeekStore";
import { useShoppingStore } from "@/store/useShoppingStore";

export default function JoinGroupScreen() {
  const { colors } = useTheme();
  const { user, groupId, setGroupId } = useAuthStore();
  const loadDishes = useDishStore((s) => s.load);
  const loadWeek = useWeekStore((s) => s.load);
  const loadShopping = useShoppingStore((s) => s.load);

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = styles(colors);

  async function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) { setError("Le code doit faire 6 caractères."); return; }
    if (!user) return;

    setError(null);
    setLoading(true);
    try {
      // Trouver le groupe
      const { data: foundGroup, error: findErr } = await supabase
        .from("groups")
        .select("id, name")
        .eq("invite_code", trimmed)
        .single();

      if (findErr || !foundGroup) {
        setError("Code invalide. Vérifie et réessaie.");
        return;
      }

      if (foundGroup.id === groupId) {
        setError("Tu es déjà dans ce groupe !");
        return;
      }

      // Copier les plats solo dans le nouveau groupe avant de rejoindre
      const { data: soloDishs } = await supabase
        .from("dishes")
        .select("name, image_uri, servings, ingredients, category_id")
        .is("group_id", null)
        .eq("created_by", user.id);

      if (soloDishs && soloDishs.length > 0) {
        await supabase.from("dishes").insert(
          soloDishs.map((d) => ({
            ...d,
            group_id: foundGroup.id,
            created_by: user.id,
          }))
        );
        // Supprimer les plats solo
        await supabase.from("dishes").delete().is("group_id", null).eq("created_by", user.id);
      }

      // Quitter l'ancien groupe si existant
      if (groupId) {
        const { data: memberCount } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", groupId);

        if (memberCount && memberCount.length === 1) {
          await supabase.from("groups").delete().eq("id", groupId);
        } else {
          await supabase
            .from("group_members")
            .delete()
            .eq("group_id", groupId)
            .eq("user_id", user.id);
        }
      }

      // Rejoindre le nouveau groupe
      const { error: joinErr } = await supabase
        .from("group_members")
        .insert({ group_id: foundGroup.id, user_id: user.id });

      if (joinErr) throw joinErr;

      setGroupId(foundGroup.id);

      // Recharger les données du nouveau groupe
      await Promise.all([loadDishes(), loadWeek(), loadShopping()]);

      Alert.alert("Bienvenue !", `Tu as rejoint le groupe "${foundGroup.name}".`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la connexion au groupe.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Rejoindre un groupe</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.body}>
        <Ionicons name="people" size={56} color={colors.primary} style={s.icon} />
        <Text style={[s.subtitle, { color: colors.textMuted }]}>
          Saisis le code d'invitation de 6 lettres que quelqu'un t'a partagé.
        </Text>

        {error && (
          <View style={[s.errorBanner, { backgroundColor: colors.dangerGlow }]}>
            <Text style={[s.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <TextInput
          style={[s.codeInput, { backgroundColor: colors.surface, color: colors.primary, borderColor: colors.border }]}
          placeholder="XXXXXX"
          placeholderTextColor={colors.textSubtle}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          autoCapitalize="characters"
          maxLength={6}
          autoFocus
        />

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: colors.primary }, loading && s.disabled]}
          onPress={handleJoin}
          disabled={loading || code.trim().length !== 6}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.primaryBtnText}>Rejoindre</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: { flex: 1, padding: spacing.lg },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.xxl,
    },
    backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "700" },
    body: { flex: 1, alignItems: "center", gap: spacing.lg, paddingTop: spacing.xl },
    icon: { marginBottom: spacing.sm },
    subtitle: { fontSize: 15, textAlign: "center", lineHeight: 22 },
    errorBanner: {
      padding: spacing.md,
      borderRadius: radius.md,
      width: "100%",
    },
    errorText: { fontSize: 14, textAlign: "center" },
    codeInput: {
      width: "100%",
      height: 64,
      borderRadius: radius.lg,
      borderWidth: 1,
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: 8,
      textAlign: "center",
    },
    primaryBtn: {
      width: "100%",
      height: 48,
      borderRadius: radius.md,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    disabled: { opacity: 0.5 },
  });
