import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDishStore } from "@/store/useDishStore";
import { useWeekStore } from "@/store/useWeekStore";
import { useShoppingStore } from "@/store/useShoppingStore";
import { useTheme } from "@/lib/ThemeContext";
import { fontFamily, radius, spacing } from "@/lib/theme";
import { DAYS_FR, SLOTS } from "@/types/models";
import { LOCAL_RECIPES } from "@/data/recipes";
import { currentWeekStart, offsetWeek } from "@/lib/weekDates";

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// 0 = lundi, 6 = dimanche (comme notre WeekPlan)
function getTodayIndex(): number {
  const jsDay = new Date().getDay(); // 0=dim, 1=lun...
  return jsDay === 0 ? 6 : jsDay - 1;
}

function getDishName(
  dishId: string | undefined,
  dishById: Map<string, { name: string }>
): string | undefined {
  if (!dishId) return undefined;
  if (dishId.startsWith("recipe-")) {
    const recipeId = dishId.replace("recipe-", "");
    return LOCAL_RECIPES.find((r) => r.id === recipeId)?.name;
  }
  return dishById.get(dishId)?.name;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const dishes = useDishStore((s) => s.dishes);
  const plans = useWeekStore((s) => s.plans);
  const items = useShoppingStore((s) => s.items);
  const plan = plans[currentWeekStart()] ?? {};

  const dishById = useMemo(() => new Map(dishes.map((d) => [d.id, d])), [dishes]);

  const todayIndex = getTodayIndex();
  const todayPlan = plan[todayIndex] ?? {};
  const todayDate = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const lunchEntry = todayPlan.lunch;
  const dinnerEntry = todayPlan.dinner;

  const lunchMain = getDishName(lunchEntry?.main, dishById);
  const lunchAlt = getDishName(lunchEntry?.alt, dishById);
  const dinnerMain = getDishName(dinnerEntry?.main, dishById);
  const dinnerAlt = getDishName(dinnerEntry?.alt, dishById);

  const shoppingRemaining = items.filter((i) => !i.checked).length;
  const shoppingTotal = items.length;
  const shoppingProgress = shoppingTotal > 0 ? (shoppingTotal - shoppingRemaining) / shoppingTotal : 0;

  const weekFilled = useMemo(
    () => Object.values(plan).reduce((acc, day) => acc + Object.values(day).filter((e) => e?.main).length, 0),
    [plan]
  );
  const weekTotal = DAYS_FR.length * SLOTS.length;

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={[s.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      {/* En-tête */}
      <View style={s.header}>
        <View>
          <Text style={[s.greeting, { color: colors.textMuted }]}>Bonjour 👋</Text>
          <Text style={[s.dateLabel, { color: colors.text }]}>
            {todayDate.charAt(0).toUpperCase() + todayDate.slice(1)}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/settings")}
          style={[s.groupBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          hitSlop={8}
        >
          <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Plat du jour */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.cardTitleRow}>
          <View style={[s.cardIcon, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="today-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>Aujourd'hui</Text>
        </View>

        {!lunchMain && !dinnerMain ? (
          <View style={s.emptyMeal}>
            <Text style={[s.emptyMealText, { color: colors.textMuted }]}>
              Aucun repas prévu aujourd'hui.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/week")}
              style={[s.emptyMealBtn, { borderColor: colors.primary + "55", backgroundColor: colors.primaryGlow }]}
            >
              <Ionicons name="calendar-outline" size={13} color={colors.primary} />
              <Text style={[s.emptyMealBtnText, { color: colors.primary }]}>Voir la semaine</Text>
            </Pressable>
          </View>
        ) : (
          <View style={s.mealsRow}>
            {[
              { label: "Midi", main: lunchMain, alt: lunchAlt },
              { label: "Soir", main: dinnerMain, alt: dinnerAlt },
            ].map(({ label, main, alt }) => (
              <View
                key={label}
                style={[
                  s.mealSlot,
                  {
                    backgroundColor: main ? colors.primaryGlow : colors.overlay,
                    borderColor: main ? colors.primary + "44" : colors.border,
                  },
                ]}
              >
                <Text style={[s.mealSlotLabel, { color: colors.textSubtle }]}>{label}</Text>
                <Text
                  style={[
                    s.mealSlotDish,
                    { color: main ? colors.text : colors.textSubtle },
                    !main && { fontStyle: "italic" },
                  ]}
                  numberOfLines={2}
                >
                  {main ?? "vide"}
                </Text>
                {alt && (
                  <View style={s.mealAltRow}>
                    <Ionicons name="leaf" size={10} color={colors.success} />
                    <Text style={[s.mealAltText, { color: colors.success }]} numberOfLines={1}>
                      {alt}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Mini-grille semaine */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.cardTitleRow}>
          <View style={[s.cardIcon, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>Cette semaine</Text>
          <Text style={[s.cardSubtitle, { color: colors.textMuted }]}>
            {weekFilled}/{weekTotal} repas
          </Text>
          <Pressable onPress={() => router.push("/(tabs)/week")} style={s.cardLink} hitSlop={8}>
            <Text style={[s.cardLinkText, { color: colors.primary }]}>Modifier</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </Pressable>
        </View>

        <View style={s.weekGrid}>
          {DAYS_FR.map((_, day) => {
            const isToday = day === todayIndex;
            const dayPlan = plan[day] ?? {};
            const lunch = dayPlan.lunch?.main;
            const dinner = dayPlan.dinner?.main;
            const lunchName = getDishName(lunch, dishById);
            const dinnerName = getDishName(dinner, dishById);
            return (
              <View key={day} style={s.weekDayCol}>
                <View
                  style={[
                    s.weekDayLabel,
                    isToday && { backgroundColor: colors.primary, borderRadius: 4 },
                  ]}
                >
                  <Text
                    style={[
                      s.weekDayText,
                      { color: isToday ? "#fff" : colors.textSubtle },
                    ]}
                  >
                    {DAYS_SHORT[day]}
                  </Text>
                </View>
                <View style={[s.weekDot, { backgroundColor: lunchName ? colors.primary : colors.overlay }]} />
                <View style={[s.weekDot, { backgroundColor: dinnerName ? colors.primary : colors.overlay }]} />
              </View>
            );
          })}
        </View>

        {/* Légende */}
        <View style={s.weekLegend}>
          <View style={[s.weekDot, { backgroundColor: colors.primary }]} />
          <Text style={[s.weekLegendText, { color: colors.textSubtle }]}>Repas planifié</Text>
          <View style={[s.weekDot, { backgroundColor: colors.overlay, marginLeft: spacing.sm }]} />
          <Text style={[s.weekLegendText, { color: colors.textSubtle }]}>Vide</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.statIcon, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[s.statValue, { color: colors.text }]}>{dishes.length}</Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>plats enregistrés</Text>
        </View>

        <View style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.statIcon, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
          </View>
          <Text style={[s.statValue, { color: colors.text }]}>
            {Object.values(plans).filter((p) => Object.values(p).some((d) => Object.values(d).some((e) => e?.main))).length}
          </Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>semaines planifiées</Text>
        </View>

        <Pressable
          style={[s.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/(tabs)/shopping")}
        >
          <View style={[s.statIcon, { backgroundColor: shoppingRemaining > 0 ? colors.primaryGlow : colors.successGlow }]}>
            <Ionicons
              name="cart-outline"
              size={18}
              color={shoppingRemaining > 0 ? colors.primary : colors.success}
            />
          </View>
          <Text style={[s.statValue, { color: colors.text }]}>{shoppingRemaining}</Text>
          <Text style={[s.statLabel, { color: colors.textMuted }]}>
            {shoppingRemaining === 0 && shoppingTotal > 0 ? "courses faites ✓" : "articles restants"}
          </Text>
          {shoppingTotal > 0 && (
            <View style={[s.miniProgress, { backgroundColor: colors.overlay }]}>
              <View
                style={[
                  s.miniProgressFill,
                  {
                    width: `${shoppingProgress * 100}%` as any,
                    backgroundColor: shoppingRemaining === 0 ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
          )}
        </Pressable>
      </View>

      {/* Accès rapides */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.cardTitleRow}>
          <View style={[s.cardIcon, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="flash-outline" size={16} color={colors.primary} />
          </View>
          <Text style={[s.cardTitle, { color: colors.text }]}>Accès rapide</Text>
        </View>
        <View style={s.quickActions}>
          <QuickAction
            icon="add-circle-outline"
            label="Ajouter un plat"
            onPress={() => router.push("/(tabs)/dish/new")}
            colors={colors}
          />
          <QuickAction
            icon="calendar-outline"
            label="Voir la semaine"
            onPress={() => router.push("/(tabs)/week")}
            colors={colors}
          />
          <QuickAction
            icon="search-outline"
            label="Explorer recettes"
            onPress={() => router.push("/(tabs)/explore")}
            colors={colors}
          />
          <QuickAction
            icon="cart-outline"
            label="Ma liste de courses"
            onPress={() => router.push("/(tabs)/shopping")}
            colors={colors}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.quickAction,
        { backgroundColor: pressed ? colors.overlay : colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name={icon as never} size={22} color={colors.primary} />
      <Text style={[s.quickActionText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  greeting: { fontSize: 13, fontWeight: "500" },
  dateLabel: { fontSize: 22, fontFamily: fontFamily.display, marginTop: 2 },
  groupBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cardIcon: { width: 28, height: 28, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  cardSubtitle: { fontSize: 12 },
  cardLink: { flexDirection: "row", alignItems: "center", gap: 2 },
  cardLinkText: { fontSize: 12, fontWeight: "600" },
  emptyMeal: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  emptyMealText: { fontSize: 13 },
  emptyMealBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyMealBtnText: { fontSize: 13, fontWeight: "600" },
  mealsRow: { flexDirection: "row", gap: spacing.sm },
  mealSlot: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  mealSlotLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  mealSlotDish: { fontSize: 14, fontWeight: "600", lineHeight: 18 },
  mealAltRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  mealAltText: { fontSize: 11, fontWeight: "500" },
  weekGrid: { flexDirection: "row", justifyContent: "space-between" },
  weekDayCol: { alignItems: "center", gap: 5, flex: 1 },
  weekDayLabel: { paddingHorizontal: 3, paddingVertical: 2 },
  weekDayText: { fontSize: 10, fontWeight: "700" },
  weekDot: { width: 8, height: 8, borderRadius: 4 },
  weekLegend: { flexDirection: "row", alignItems: "center", gap: 5 },
  weekLegendText: { fontSize: 11 },
  statsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, textAlign: "center", lineHeight: 14 },
  miniProgress: { width: "100%", height: 3, borderRadius: 2, overflow: "hidden", marginTop: 2 },
  miniProgressFill: { height: "100%" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickAction: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  quickActionText: { fontSize: 13, fontWeight: "500", flex: 1 },
});
