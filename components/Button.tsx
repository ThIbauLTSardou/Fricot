import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", icon, style, disabled }: Props) {
  const { colors } = useTheme();

  const variantStyles = {
    primary: {
      btn: { backgroundColor: colors.primary, borderWidth: 0 as const },
      btnPressed: { backgroundColor: colors.primaryDark },
      labelColor: "#fff",
    },
    secondary: {
      btn: { backgroundColor: "transparent" as const, borderWidth: 1, borderColor: colors.border },
      btnPressed: { backgroundColor: colors.overlay },
      labelColor: colors.text,
    },
    danger: {
      btn: { backgroundColor: "transparent" as const, borderWidth: 1, borderColor: colors.danger },
      btnPressed: { backgroundColor: colors.dangerGlow },
      labelColor: colors.danger,
    },
    ghost: {
      btn: { backgroundColor: "transparent" as const, borderWidth: 0 as const },
      btnPressed: { backgroundColor: colors.overlay },
      labelColor: colors.textMuted,
    },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        variantStyles.btn,
        pressed && variantStyles.btnPressed,
        disabled && s.btnDisabled,
        style,
      ]}
    >
      {icon && (
        <Ionicons name={icon} size={16} color={variantStyles.labelColor} style={s.icon} />
      )}
      <Text style={[s.label, { color: variantStyles.labelColor }]}>{title}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: "row",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { marginRight: spacing.sm },
  label: { fontSize: 14, fontWeight: "600", letterSpacing: 0.2 },
  btnDisabled: { opacity: 0.4 },
});
