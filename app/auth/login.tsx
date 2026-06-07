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

export default function LoginScreen() {
  const { colors } = useTheme();
  const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = styles(colors);

  async function handleEmailLogin() {
    if (!email || !password) { setError("Remplis tous les champs."); return; }
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur Google.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setError(null);
    setLoading(true);
    try {
      await signInWithApple();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur Apple.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[s.container, { backgroundColor: colors.bg }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / titre */}
        <View style={s.header}>
          <Ionicons name="restaurant" size={48} color={colors.primary} />
          <Text style={[s.title, { color: colors.text }]}>Fricot</Text>
          <Text style={[s.subtitle, { color: colors.textMuted }]}>Connexion à ton compte</Text>
        </View>

        {/* Erreur */}
        {error && (
          <View style={[s.errorBanner, { backgroundColor: colors.dangerGlow }]}>
            <Text style={[s.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Email / Mot de passe */}
        <View style={s.form}>
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
            autoComplete="password"
          />
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }, loading && s.disabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Se connecter</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Séparateur */}
        <View style={s.divider}>
          <View style={[s.line, { backgroundColor: colors.border }]} />
          <Text style={[s.dividerText, { color: colors.textMuted }]}>ou</Text>
          <View style={[s.line, { backgroundColor: colors.border }]} />
        </View>

        {/* OAuth */}
        <View style={s.oauthGroup}>
          <TouchableOpacity
            style={[s.oauthBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleGoogle}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={colors.text} />
            <Text style={[s.oauthText, { color: colors.text }]}>Continuer avec Google</Text>
          </TouchableOpacity>

          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={[s.oauthBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleApple}
              disabled={loading}
            >
              <Ionicons name="logo-apple" size={20} color={colors.text} />
              <Text style={[s.oauthText, { color: colors.text }]}>Continuer avec Apple</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Lien inscription */}
        <View style={s.footer}>
          <Text style={[s.footerText, { color: colors.textMuted }]}>Pas encore de compte ? </Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={[s.footerLink, { color: colors.primary }]}>S'inscrire</Text>
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
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.xl,
      gap: spacing.md,
    },
    line: {
      flex: 1,
      height: 1,
    },
    dividerText: {
      fontSize: 13,
    },
    oauthGroup: {
      gap: spacing.md,
    },
    oauthBtn: {
      height: 48,
      borderRadius: radius.md,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    oauthText: {
      fontSize: 15,
      fontWeight: "500",
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
