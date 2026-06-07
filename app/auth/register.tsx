import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { spacing, radius, fontFamily } from "@/lib/theme";
import { useAuthStore } from "@/store/useAuthStore";

export default function RegisterScreen() {
  const { colors } = useTheme();
  const { signUpWithEmail } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const s = styles(colors);

  async function handleRegister() {
    if (!email || !password || !confirm) { setError("Remplis tous les champs."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Le mot de passe doit faire au moins 6 caractères."); return; }
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim() || undefined);
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <ScrollView contentContainerStyle={[s.container, { backgroundColor: colors.bg, justifyContent: "center" }]}>
        <View style={s.header}>
          <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          <Text style={[s.title, { color: colors.text }]}>Compte créé !</Text>
          <Text style={[s.subtitle, { color: colors.textMuted, textAlign: "center" }]}>
            Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.
          </Text>
        </View>
        <Link href="/auth/login" asChild>
          <TouchableOpacity style={[s.primaryBtn, { backgroundColor: colors.primary }]}>
            <Text style={s.primaryBtnText}>Se connecter</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.container, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <Ionicons name="restaurant" size={48} color={colors.primary} />
          <Text style={[s.title, { color: colors.text }]}>Créer un compte</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>Rejoins Fricot gratuitement</Text>
        </View>

        {error && (
          <View style={[s.errorBanner, { backgroundColor: colors.dangerGlow }]}>
            <Text style={[s.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        <View style={s.form}>
          <TextInput
            style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Prénom (optionnel)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />
          <TextInput
            style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Mot de passe"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <TextInput
            style={[s.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Confirmer le mot de passe"
            placeholderTextColor={colors.textMuted}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
          />
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }, loading && s.disabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Créer mon compte</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.textMuted }]}>Déjà un compte ? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={[s.footerLink, { color: colors.primary }]}>Se connecter</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: spacing.xl,
      justifyContent: "center",
    },
    header: {
      alignItems: "center",
      marginBottom: spacing.xxl,
      gap: spacing.sm,
    },
    title: {
      fontSize: 36,
      fontFamily: fontFamily.display,
    },
    subtitle: {
      fontSize: 15,
    },
    errorBanner: {
      padding: spacing.md,
      borderRadius: radius.md,
      marginBottom: spacing.lg,
    },
    errorText: {
      fontSize: 14,
      textAlign: "center",
    },
    form: {
      gap: spacing.md,
    },
    input: {
      height: 48,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.md,
      borderWidth: 1,
      fontSize: 15,
    },
    primaryBtn: {
      height: 48,
      borderRadius: radius.md,
      justifyContent: "center",
      alignItems: "center",
      marginTop: spacing.xs,
    },
    primaryBtnText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: 15,
    },
    disabled: {
      opacity: 0.6,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: spacing.xxl,
    },
    footerText: {
      fontSize: 14,
    },
    footerLink: {
      fontSize: 14,
      fontWeight: "600",
    },
  });
