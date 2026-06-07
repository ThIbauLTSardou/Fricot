import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { fontFamily, radius, spacing } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { isPasswordValid, getPasswordError } from "@/lib/passwordStrength";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

function parseFragment(url: string): Record<string, string> {
  const hash = url.split("#")[1] ?? "";
  return Object.fromEntries(new URLSearchParams(hash));
}

export default function ResetPasswordScreen() {
  const { colors } = useTheme();

  const [ready, setReady] = useState(false);
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdVisible, setPwdVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const s = styles(colors);

  useEffect(() => {
    async function init() {
      // Récupère l'URL initiale qui a ouvert l'app (deep link)
      const initialUrl = await Linking.getInitialURL();
      const url = initialUrl ?? "";
      const params = parseFragment(url);
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          Alert.alert("Lien invalide", "Ce lien a expiré ou est invalide.", [
            { text: "OK", onPress: () => router.replace("/auth/login") },
          ]);
        } else {
          setReady(true);
        }
      } else {
        // Fallback : session déjà établie via onAuthStateChange
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
        } else {
          Alert.alert("Lien invalide", "Ce lien a expiré ou est invalide.", [
            { text: "OK", onPress: () => router.replace("/auth/login") },
          ]);
        }
      }
    }
    init();
  }, []);

  async function handleSave() {
    const error = getPasswordError(newPwd, confirmPwd);
    if (error) { Alert.alert("Erreur", error); return; }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
      if (updateError) throw updateError;
      setDone(true);
    } catch (e: unknown) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <View style={[s.successIcon, { backgroundColor: colors.successGlow }]}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>Mot de passe modifié !</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>
          Tu peux maintenant te connecter avec ton nouveau mot de passe.
        </Text>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={s.btnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={[s.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[s.subtitle, { color: colors.textMuted, marginTop: spacing.md }]}>
          Vérification du lien…
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.container, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[s.iconWrap, { backgroundColor: colors.primaryGlow }]}>
          <Ionicons name="lock-open-outline" size={32} color={colors.primary} />
        </View>
        <Text style={[s.title, { color: colors.text }]}>Nouveau mot de passe</Text>
        <Text style={[s.subtitle, { color: colors.textMuted }]}>
          Choisis un mot de passe robuste pour sécuriser ton compte.
        </Text>

        <View style={s.form}>
          <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

          <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing.sm }]}>
            <TextInput
              style={[s.input, { color: colors.text }]}
              value={confirmPwd}
              onChangeText={setConfirmPwd}
              secureTextEntry={!pwdVisible}
              placeholder="Confirmer le mot de passe"
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.primary, opacity: isPasswordValid(newPwd) && confirmPwd ? 1 : 0.5 }]}
            onPress={handleSave}
            disabled={loading || !isPasswordValid(newPwd) || !confirmPwd}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>Enregistrer</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.lg },
    container: { flexGrow: 1, padding: spacing.xl, justifyContent: "center", gap: spacing.md },
    iconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", alignSelf: "center", marginBottom: spacing.sm },
    successIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 28, fontFamily: fontFamily.display, textAlign: "center" },
    subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    form: { gap: spacing.sm, marginTop: spacing.md },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
    },
    input: { flex: 1, paddingVertical: spacing.md, fontSize: 15, letterSpacing: 0 },
    btn: {
      height: 48,
      borderRadius: radius.md,
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.sm,
    },
    btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  });
