import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Dish } from "@/types/models";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";

type Props = {
  dish: Dish;
  onPress: () => void;
};

export function DishCard({ dish, onPress }: Props) {
  const { colors } = useTheme();
  const count = dish.ingredients.filter((i) => i.name.trim()).length;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        {
          backgroundColor: pressed ? colors.cardHover : colors.card,
          borderColor: pressed ? colors.borderStrong : colors.border,
        },
      ]}
    >
      {dish.imageUri ? (
        <Image source={{ uri: dish.imageUri }} style={[s.image, { backgroundColor: colors.overlay }]} />
      ) : (
        <View style={[s.image, s.placeholder, { backgroundColor: colors.overlay }]}>
          <Ionicons name="fast-food-outline" size={22} color={colors.textSubtle} />
        </View>
      )}
      <View style={s.body}>
        <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
          {dish.name}
        </Text>
        <View style={s.meta}>
          <View style={[s.badge, { backgroundColor: colors.badgeBg, borderColor: colors.primaryDark + "55" }]}>
            <Text style={[s.badgeText, { color: colors.badgeText }]}>{dish.servings} pers.</Text>
          </View>
          <View style={[s.badge, { backgroundColor: colors.badgeBg, borderColor: colors.primaryDark + "55" }]}>
            <Text style={[s.badgeText, { color: colors.badgeText }]}>{count} ingr.</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  image: { width: 48, height: 48, borderRadius: radius.sm },
  placeholder: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: spacing.xs },
  name: { fontSize: 14, fontWeight: "600", letterSpacing: 0.1 },
  meta: { flexDirection: "row", gap: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "500" },
});
