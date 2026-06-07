import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Dish, MealSlot, WeekPlan } from "@/types/models";
import { DAYS_FR, SLOTS } from "@/types/models";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";

type Props = {
  plan: WeekPlan;
  dishById: Map<string, Dish>;
  onPressSlot: (day: number, slot: MealSlot) => void;
};

export function WeekGrid({ plan, dishById, onPressSlot }: Props) {
  const { colors } = useTheme();

  return (
    <View style={s.grid}>
      {DAYS_FR.map((dayLabel, day) => (
        <View key={day} style={[s.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.dayLabel, { color: colors.textMuted }]}>{dayLabel}</Text>
          <View style={s.slotsRow}>
            {SLOTS.map((slot) => {
              const entry = plan[day]?.[slot.key];
              const dish = entry?.main ? dishById.get(entry.main) : undefined;
              return (
                <Pressable
                  key={slot.key}
                  style={({ pressed }) => [
                    s.slot,
                    {
                      backgroundColor: dish ? colors.primaryGlow : colors.surface,
                      borderColor: dish ? colors.primary + "55" : colors.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                  onPress={() => onPressSlot(day, slot.key)}
                >
                  <Text style={[s.slotLabel, { color: colors.textSubtle }]}>{slot.label}</Text>
                  <Text
                    style={[
                      s.slotDish,
                      { color: dish ? colors.text : colors.textSubtle },
                      !dish && s.slotDishEmpty,
                    ]}
                    numberOfLines={2}
                  >
                    {dish ? dish.name : "vide"}
                  </Text>
                  {dish && <View style={[s.slotDot, { backgroundColor: colors.primary }]} />}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  grid: { gap: spacing.sm },
  dayCard: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  dayLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  slotsRow: { flexDirection: "row", gap: spacing.sm },
  slot: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.sm,
    position: "relative",
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  slotDish: { fontSize: 13, marginTop: spacing.xs, fontWeight: "500" },
  slotDishEmpty: { fontStyle: "italic", fontWeight: "400" },
  slotDot: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
