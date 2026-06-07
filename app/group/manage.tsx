import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Share,
  Alert,
  TextInput,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { spacing, radius, fontFamily } from "@/lib/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { useDishStore } from "@/store/useDishStore";
import { supabase } from "@/lib/supabase";

type Member = { user_id: string; display_name: string | null; joined_at: string };
type GroupInfo = { id: string; name: string; invite_code: string; owner_id: string };

export default function ManageGroupScreen() {
  const { colors } = useTheme();
  const { user, groupId, setGroupId, refreshGroupId } = useAuthStore();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Create group state
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const s = styles(colors);

  useEffect(() => {
    if (groupId) {
      loadGroup();
    } else {
      setLoading(false);
    }
  }, [groupId]);

  async function loadGroup() {
    if (!groupId) return;
    setLoading(true);
    try {
      const { data: gData } = await supabase
        .from("groups")
        .select("id, name, invite_code, owner_id")
        .eq("id", groupId)
        .single();

      const { data: mData } = await supabase
        .from("group_members")
        .select("user_id, joined_at, profiles(display_name)")
        .eq("group_id", groupId);

      if (gData) setGroup(gData);
      if (mData) {
        setMembers(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mData.map((m: any) => ({
            user_id: m.user_id as string,
            joined_at: m.joined_at as string,
            display_name: (Array.isArray(m.profiles) ? m.profiles[0]?.display_name : m.profiles?.display_name) ?? null,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function createGroup() {
    if (!user || !newGroupName.trim()) return;
    setCreateLoading(true);
    try {
      const { data: gData, error: gError } = await supabase
        .from("groups")
        .insert({ name: newGroupName.trim(), owner_id: user.id })
        .select("id")
        .single();
      if (gError) throw gError;
      const newGroupId = gData.id;

      // Copier les plats solo dans le groupe
      const { data: soloDishs } = await supabase
        .from("dishes")
        .select("id, name, image_uri, servings, ingredients, category_id")
        .is("group_id", null)
        .eq("created_by", user.id);

      if (soloDishs && soloDishs.length > 0) {
        await supabase.from("dishes").insert(
          soloDishs.map((d) => ({
            ...d,
            id: undefined,
            group_id: newGroupId,
            created_by: user.id,
          }))
        );
        // Supprimer les plats solo (maintenant dans le groupe)
        await supabase.from("dishes").delete().is("group_id", null).eq("created_by", user.id);
      }

      // Rejoindre le groupe
      const { error: mError } = await supabase
        .from("group_members")
        .insert({ group_id: newGroupId, user_id: user.id });
      if (mError) throw mError;

      await refreshGroupId(user.id);
      setCreating(false);
      setNewGroupName("");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message ?? "Impossible de créer le groupe.");
    } finally {
      setCreateLoading(false);
    }
  }

  async function regenerateCode() {
    if (!groupId) return;
    setActionLoading(true);
    try {
      const { data: newCode, error } = await supabase.rpc("regenerate_invite_code", { target_group_id: groupId });
      if (error) throw error;
      if (newCode) setGroup((g) => g ? { ...g, invite_code: newCode as string } : g);
    } finally {
      setActionLoading(false);
    }
  }

  async function shareCode() {
    if (!group) return;
    await Share.share({
      message: `Rejoins mon groupe "${group.name}" sur Fricot ! Code d'invitation : ${group.invite_code}`,
    });
  }

  async function leaveGroup() {
    if (!groupId || !user) return;
    const isOwner = group?.owner_id === user.id;
    const memberCount = members.length;

    if (isOwner && memberCount > 1) {
      Alert.alert(
        "Propriétaire du groupe",
        "Tu es le propriétaire. Assigne un autre propriétaire avant de quitter, ou supprime le groupe.",
        [{ text: "OK" }]
      );
      return;
    }

    Alert.alert(
      isOwner && memberCount === 1 ? "Supprimer le groupe" : "Quitter le groupe",
      isOwner && memberCount === 1
        ? "Toutes les données du groupe seront supprimées. Tes plats personnels seront conservés."
        : "Tu quitteras le groupe. Seuls tes plats créés par toi seront conservés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              // Copier les plats créés par l'utilisateur en mode solo (group_id = null)
              const { data: myDishes } = await supabase
                .from("dishes")
                .select("name, image_uri, servings, ingredients, category_id")
                .eq("group_id", groupId)
                .eq("created_by", user.id);

              if (myDishes && myDishes.length > 0) {
                await supabase.from("dishes").insert(
                  myDishes.map((d) => ({
                    ...d,
                    group_id: null,
                    created_by: user.id,
                  }))
                );
              }

              if (isOwner && memberCount === 1) {
                await supabase.from("groups").delete().eq("id", groupId);
              } else {
                await supabase
                  .from("group_members")
                  .delete()
                  .eq("group_id", groupId)
                  .eq("user_id", user.id);
              }

              await refreshGroupId(user.id);
              // Recharger les plats solo
              useDishStore.getState().load();
              router.back();
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // Pas de groupe — afficher l'écran de création
  if (!groupId) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text }]}>Groupe</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[s.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={[s.emptyTitle, { color: colors.text }]}>Pas encore de groupe</Text>
          <Text style={[s.emptyDesc, { color: colors.textMuted }]}>
            Crée un groupe pour partager tes menus et ta liste de courses avec d'autres personnes.
          </Text>
        </View>

        {creating ? (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.cardLabel, { color: colors.textMuted }]}>Nom du groupe</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.overlay }]}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Ex: La famille Dupont"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            <View style={s.createActions}>
              <TouchableOpacity
                style={[s.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
                onPress={() => { setCreating(false); setNewGroupName(""); }}
              >
                <Text style={[s.secondaryBtnText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.primary, flex: 1, opacity: newGroupName.trim() ? 1 : 0.5 }]}
                onPress={createGroup}
                disabled={createLoading || !newGroupName.trim()}
              >
                {createLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.primaryBtnText}>Créer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreating(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Créer un groupe</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.secondaryBtn, { borderColor: colors.primary }]}
          onPress={() => router.push("/group/join")}
        >
          <Ionicons name="enter-outline" size={16} color={colors.primary} />
          <Text style={[s.secondaryBtnText, { color: colors.primary }]}>Rejoindre un groupe existant</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const isOwner = group?.owner_id === user?.id;
  const isPersonal = members.length === 1 && isOwner;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Mon groupe</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Nom du groupe */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.cardLabel, { color: colors.textMuted }]}>Groupe</Text>
        <Text style={[s.groupName, { color: colors.text }]}>{group?.name}</Text>
        {isPersonal && (
          <Text style={[s.personalNote, { color: colors.textMuted }]}>
            Groupe personnel — invite des membres pour partager tes menus !
          </Text>
        )}
      </View>

      {/* Code d'invitation */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.cardLabel, { color: colors.textMuted }]}>Code d'invitation</Text>
        <View style={s.codeRow}>
          <Text style={[s.code, { color: colors.primary, backgroundColor: colors.primaryGlow }]}>
            {group?.invite_code}
          </Text>
          <TouchableOpacity onPress={shareCode} style={[s.iconBtn, { backgroundColor: colors.overlay }]}>
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity
              onPress={regenerateCode}
              style={[s.iconBtn, { backgroundColor: colors.overlay }]}
              disabled={actionLoading}
            >
              <Ionicons name="refresh-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[s.secondaryBtn, { borderColor: colors.primary }]}
          onPress={() => router.push("/group/join")}
        >
          <Ionicons name="people-outline" size={16} color={colors.primary} />
          <Text style={[s.secondaryBtnText, { color: colors.primary }]}>Rejoindre un autre groupe</Text>
        </TouchableOpacity>
      </View>

      {/* Membres */}
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.cardLabel, { color: colors.textMuted }]}>
          Membres ({members.length})
        </Text>
        {members.map((m) => (
          <View key={m.user_id} style={[s.memberRow, { borderColor: colors.border }]}>
            <View style={[s.avatar, { backgroundColor: colors.primaryGlow }]}>
              <Text style={[s.avatarText, { color: colors.primary }]}>
                {(m.display_name ?? "?")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.memberName, { color: colors.text }]}>
                {m.display_name ?? "Membre"}
                {m.user_id === user?.id ? " (toi)" : ""}
                {m.user_id === group?.owner_id ? " 👑" : ""}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Quitter / supprimer */}
      <TouchableOpacity
        style={[s.dangerBtn, { borderColor: colors.danger }]}
        onPress={leaveGroup}
        disabled={actionLoading}
      >
        <Ionicons
          name={isOwner && members.length === 1 ? "trash-outline" : "exit-outline"}
          size={16}
          color={colors.danger}
        />
        <Text style={[s.dangerBtnText, { color: colors.danger }]}>
          {isOwner && members.length === 1 ? "Supprimer le groupe" : "Quitter le groupe"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "700" },
    card: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
      gap: spacing.md,
    },
    cardLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
    groupName: { fontSize: 26, fontFamily: fontFamily.display },
    personalNote: { fontSize: 13, lineHeight: 18 },
    codeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    code: {
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
    },
    iconBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      justifyContent: "center",
      alignItems: "center",
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    secondaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    secondaryBtnText: { fontWeight: "600", fontSize: 14 },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { fontWeight: "700", fontSize: 16 },
    memberName: { fontSize: 15 },
    dangerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    dangerBtnText: { fontWeight: "600", fontSize: 14 },
    emptyState: {
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.xl,
      gap: spacing.md,
      alignItems: "center",
    },
    emptyTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
    emptyDesc: { fontSize: 14, lineHeight: 20, textAlign: "center" },
    input: {
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
      fontSize: 16,
    },
    createActions: {
      flexDirection: "row",
      gap: spacing.md,
    },
  });
