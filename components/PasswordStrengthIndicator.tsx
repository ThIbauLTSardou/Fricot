import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { spacing, radius } from "@/lib/theme";
import { PASSWORD_RULES, getPasswordStrength } from "@/lib/passwordStrength";

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const { colors } = useTheme();
  if (!password) return null;

  const { passed, total, strength } = getPasswordStrength(password);

  const strengthColor =
    strength === "strong" ? colors.success :
    strength === "medium" ? "#f0a830" :
    colors.danger;

  const strengthLabel =
    strength === "strong" ? "Robuste" :
    strength === "medium" ? "Moyen" :
    "Faible";

  return (
    <View style={s.container}>
      {/* Barre de force */}
      <View style={s.barRow}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              s.barSegment,
              { backgroundColor: i < passed ? strengthColor : colors.overlay },
            ]}
          />
        ))}
        <Text style={[s.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
      </View>

      {/* Critères */}
      <View style={s.rules}>
        {PASSWORD_RULES.map((rule) => {
          const ok = rule.test(password);
          return (
            <View key={rule.key} style={s.ruleRow}>
              <Ionicons
                name={ok ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={ok ? colors.success : colors.textSubtle}
              />
              <Text style={[s.ruleText, { color: ok ? colors.text : colors.textSubtle }]}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: spacing.sm, marginTop: spacing.xs },
  barRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  barSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: "700", marginLeft: spacing.xs },
  rules: { gap: 5 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ruleText: { fontSize: 12 },
});
