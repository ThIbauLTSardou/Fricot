import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { fontFamily, radius, spacing } from "@/lib/theme";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/lib/supabase";
import { isPasswordValid, getPasswordError } from "@/lib/passwordStrength";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

export default function SettingsScreen() {
  const { colors, isDark, toggle } = useTheme();
  const { user, groupId, signOut } = useAuthStore();

  // Étapes : idle → confirm_current → new_password
  const [pwdStep, setPwdStep] = useState<"idle" | "confirm_current" | "new_password">("idle");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdVisible, setPwdVisible] = useState(false);

  const s = styles(colors);

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Utilisateur";
  const email = user?.email ?? "";
  const initial = displayName[0].toUpperCase();

  function resetPwdFlow() {
    setPwdStep("idle");
    setCurrentPwd("");
    setNewPwd("");
    setConfirmPwd("");
    setPwdVisible(false);
  }

  async function verifyCurrentPassword() {
    if (!currentPwd || !email) return;
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
      if (error) throw new Error("Mot de passe incorrect.");
      setPwdStep("new_password");
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setPwdLoading(false);
    }
  }

  async function handleChangePassword() {
    const pwdError = getPasswordError(newPwd, confirmPwd);
    if (pwdError) { Alert.alert("Erreur", pwdError); return; }
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      Alert.alert("Succès ✓", "Ton mot de passe a été modifié.");
      resetPwdFlow();
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setPwdLoading(false);
    }
  }

  function handleSignOut() {
    Alert.alert("Se déconnecter", "Tu seras redirigé vers l'écran de connexion.", [
      { text: "Annuler", style: "cancel" },
      { text: "Se déconnecter", style: "destructive", onPress: () => signOut() },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: colors.text }]}>Paramètres</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profil */}
      <View style={[s.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[s.avatar, { backgroundColor: colors.primaryGlow }]}>
          <Text style={[s.avatarText, { color: colors.primary }]}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.profileName, { color: colors.text }]}>{displayName}</Text>
          <Text style={[s.profileEmail, { color: colors.textMuted }]}>{email}</Text>
        </View>
      </View>

      {/* Groupe */}
      <SectionLabel label="Groupe" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Row
          icon="people-outline"
          label={groupId ? "Gérer mon groupe" : "Créer ou rejoindre un groupe"}
          onPress={() => router.push("/group/manage")}
          colors={colors}
          chevron
        />
      </View>

      {/* Apparence */}
      <SectionLabel label="Apparence" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TouchableOpacity style={s.row} onPress={toggle}>
          <View style={[s.rowIcon, { backgroundColor: colors.overlay }]}>
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={colors.text} />
          </View>
          <Text style={[s.rowLabel, { color: colors.text }]}>{isDark ? "Mode clair" : "Mode sombre"}</Text>
          <View style={[s.toggle, { backgroundColor: isDark ? colors.primary : colors.overlay }]}>
            <View style={[s.toggleDot, { transform: [{ translateX: isDark ? 18 : 2 }], backgroundColor: "#fff" }]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Sécurité */}
      <SectionLabel label="Sécurité" colors={colors} />
      <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {pwdStep === "idle" && (
          <Row
            icon="lock-closed-outline"
            label="Changer le mot de passe"
            onPress={() => setPwdStep("confirm_current")}
            colors={colors}
            chevron
          />
        )}

        {pwdStep === "confirm_current" && (
          <View style={s.pwdForm}>
            <View style={[s.otpInfo, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="shield-outline" size={18} color={colors.primary} />
              <Text style={[s.otpInfoText, { color: colors.primary }]}>
                Confirme ton mot de passe actuel pour continuer.
              </Text>
            </View>
            <View style={[s.inputRow, { backgroundColor: colors.overlay, borderColor: colors.border }]}>
              <TextInput
                style={[s.input, { color: colors.text }]}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                secureTextEntry={!pwdVisible}
                placeholder="Mot de passe actuel"
                placeholderTextColor={colors.textSubtle}
                autoFocus
              />
              <TouchableOpacity onPress={() => setPwdVisible((v) => !v)} hitSlop={8}>
                <Ionicons name={pwdVisible ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={s.pwdActions}>
              <TouchableOpacity style={[s.btnSecondary, { borderColor: colors.border }]} onPress={resetPwdFlow}>
                <Text style={[s.btnSecondaryText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor: colors.primary, opacity: currentPwd ? 1 : 0.5 }]}
                onPress={verifyCurrentPassword}
                disabled={pwdLoading || !currentPwd}
              >
                {pwdLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnPrimaryText}>Vérifier</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {pwdStep === "new_password" && (
          <View style={s.pwdForm}>
            <View style={[s.otpInfo, { backgroundColor: colors.successGlow }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} />
              <Text style={[s.otpInfoText, { color: colors.success }]}>Identité vérifiée</Text>
            </View>
            <View style={[s.inputRow, { backgroundColor: colors.overlay, borderColor: colors.border }]}>
              <TextInput
                style={[s.input, { color: colors.text }]}
                value={newPwd}
                onChangeText={setNewPwd}
                secureTextEntry={!pwdVisible}
                placeholder="Nouveau mot de passe"
                placeholderTextColor={colors.textSubtle}
                autoFocus
              />
              <TouchableOpacity onPress={() => setPwdVisible((v) => !v)} hitSlop={8}>
                <Ionicons name={pwdVisible ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <PasswordStrengthIndicator password={newPwd} />
            <View style={[s.inputRow, { backgroundColor: colors.overlay, borderColor: colors.border }]}>
              <TextInput
                style={[s.input, { color: colors.text }]}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                secureTextEntry={!pwdVisible}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor={colors.textSubtle}
              />
            </View>
            <View style={s.pwdActions}>
              <TouchableOpacity style={[s.btnSecondary, { borderColor: colors.border }]} onPress={resetPwdFlow}>
                <Text style={[s.btnSecondaryText, { color: colors.textMuted }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnPrimary, { backgroundColor: colors.primary, opacity: isPasswordValid(newPwd) && confirmPwd ? 1 : 0.5 }]}
                onPress={handleChangePassword}
                disabled={pwdLoading || !isPasswordValid(newPwd) || !confirmPwd}
              >
                {pwdLoading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnPrimaryText}>Enregistrer</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Déconnexion */}
      <TouchableOpacity
        style={[s.signOutBtn, { borderColor: colors.danger }]}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[s.signOutText, { color: colors.danger }]}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={[s.version, { color: colors.textSubtle }]}>Fricot v1.0</Text>
    </ScrollView>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[{ fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: -4, paddingHorizontal: 2 }, { color: colors.textMuted }]}>
      {label}
    </Text>
  );
}

function Row({ icon, label, onPress, colors, chevron }: { icon: string; label: string; onPress: () => void; colors: any; chevron?: boolean }) {
  return (
    <TouchableOpacity style={styles(colors).row} onPress={onPress}>
      <View style={[styles(colors).rowIcon, { backgroundColor: colors.overlay }]}>
        <Ionicons name={icon as never} size={18} color={colors.text} />
      </View>
      <Text style={[styles(colors).rowLabel, { color: colors.text, flex: 1 }]}>{label}</Text>
      {chevron && <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />}
    </TouchableOpacity>
  );
}

const styles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontFamily: fontFamily.display },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { fontSize: 22, fontWeight: "700" },
    profileName: { fontSize: 16, fontWeight: "700" },
    profileEmail: { fontSize: 13, marginTop: 2 },
    card: { borderRadius: radius.lg, borderWidth: 1, overflow: "hidden" },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    rowLabel: { fontSize: 15 },
    toggle: {
      width: 42,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
    },
    toggleDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      position: "absolute",
    },
    pwdForm: { padding: spacing.md, gap: spacing.sm },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    input: { flex: 1, paddingVertical: spacing.md, fontSize: 14, letterSpacing: 0 },
    pwdActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
    otpInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
    },
    otpInfoText: { flex: 1, fontSize: 13, lineHeight: 18 },
    btnPrimary: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.md,
      borderRadius: radius.md,
    },
    btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    btnSecondary: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
    },
    btnSecondaryText: { fontWeight: "600", fontSize: 14 },
    signOutBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    signOutText: { fontWeight: "600", fontSize: 14 },
    version: { fontSize: 12, textAlign: "center", marginTop: spacing.xs },
  });
