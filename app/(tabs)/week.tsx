import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Dish, MealSlot, SlotEntry, WeekPlan } from "@/types/models";
import { DAYS_FR, SLOTS } from "@/types/models";
import { useDishStore } from "@/store/useDishStore";
import { useWeekStore } from "@/store/useWeekStore";
import { useCategoryStore } from "@/store/useCategoryStore";
import { DishPickerModal } from "@/components/DishPickerModal";
import { Button } from "@/components/Button";
import { confirm } from "@/lib/confirm";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";
import { LOCAL_RECIPES } from "@/data/recipes";
import { currentWeekStart, offsetWeek, weekLabel, weekDays } from "@/lib/weekDates";
import { detectDishCategory } from "@/lib/dishCategory";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PAST = 4;
const FUTURE = 4;
const TOTAL = PAST + 1 + FUTURE;
const INITIAL_INDEX = PAST; // index de la semaine courante

function buildWeekStarts(): string[] {
  const cur = currentWeekStart();
  return Array.from({ length: TOTAL }, (_, i) => offsetWeek(cur, i - PAST));
}

const WEEK_STARTS = buildWeekStarts();

function recipeToDish(r: (typeof LOCAL_RECIPES)[number]): Dish {
  return { id: `recipe-${r.id}`, name: r.name, servings: r.servings, ingredients: r.ingredients };
}
const RECIPE_DISHES: Dish[] = LOCAL_RECIPES.map(recipeToDish);

type SlotRef = { weekStart: string; day: number; slot: MealSlot; kind: "main" | "alt" };
type DishSource = "mine" | "app";

function slotKey(day: number, slot: MealSlot) { return `${day}-${slot}`; }

function randomDishId(dishes: Dish[], exclude?: string): string {
  if (dishes.length === 1) return dishes[0].id;
  const pool = exclude ? dishes.filter((d) => d.id !== exclude) : dishes;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// ─── AnimatedSlot ──────────────────────────────────────────────────────────────

type SlotProps = {
  entry: SlotEntry | undefined;
  mainName: string | undefined;
  altName: string | undefined;
  mainEmoji: string | undefined;
  altEmoji: string | undefined;
  isRecipeSlot: boolean;
  slotLabel: string;
  isSelected: boolean;
  isSwapSource: boolean;
  flash: boolean;
  isPast: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onAddAlt: () => void;
  onRemoveAlt: () => void;
};

function AnimatedSlot({
  mainName, altName, mainEmoji, altEmoji, isRecipeSlot, slotLabel,
  isSelected, isSwapSource, flash, isPast,
  onPress, onLongPress, onAddAlt, onRemoveAlt,
}: SlotProps) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!flash) return;
    anim.setValue(1);
    Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: false }).start();
  }, [flash]);

  const flashBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      isSelected || isSwapSource ? colors.primary + "22" : mainName ? colors.primaryGlow : colors.surface,
      colors.primary + "66",
    ],
  });
  const borderColor = isSelected || isSwapSource ? colors.primary : mainName ? colors.primary + "55" : colors.border;

  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={isPast ? 1 : 0.75} style={{ flex: 1 }} disabled={isPast}>
      <Animated.View style={[s.slot, { backgroundColor: flashBg, borderColor, borderWidth: isSelected || isSwapSource ? 2 : 1, opacity: isPast ? 0.7 : 1 }]}>
        <View style={s.slotHeader}>
          <Text style={[s.slotLabel, { color: colors.textSubtle }]}>{slotLabel}</Text>
          <View style={{ flexDirection: "row", gap: 3 }}>
            {isRecipeSlot && mainName && (
              <View style={[s.recipeBadge, { backgroundColor: colors.overlay }]}>
                <Ionicons name="book-outline" size={8} color={colors.textSubtle} />
              </View>
            )}
            {isSelected && <Ionicons name="checkmark-circle" size={12} color={colors.primary} />}
            {isSwapSource && !isSelected && <Ionicons name="swap-horizontal" size={12} color={colors.primary} />}
          </View>
        </View>
        {mainName ? (
          <View style={s.slotDishRow}>
            {mainEmoji && <Text style={s.slotEmoji}>{mainEmoji}</Text>}
            <Text style={[s.slotDish, { color: colors.text, flex: 1 }]} numberOfLines={2}>{mainName}</Text>
          </View>
        ) : (
          <Text style={[s.slotDish, s.slotDishEmpty, { color: colors.textSubtle }]}>vide</Text>
        )}
        {altName ? (
          <TouchableOpacity onPress={onRemoveAlt} disabled={isPast} style={[s.altChip, { backgroundColor: colors.successGlow, borderColor: colors.success + "55" }]}>
            {altEmoji && <Text style={s.altEmoji}>{altEmoji}</Text>}
            <Text style={[s.altChipText, { color: colors.success }]} numberOfLines={1}>{altName}</Text>
            {!isPast && <Ionicons name="close" size={9} color={colors.success} />}
          </TouchableOpacity>
        ) : mainName && !isPast ? (
          <TouchableOpacity onPress={onAddAlt} style={[s.altAdd, { borderColor: colors.success + "55" }]}>
            <Ionicons name="add" size={10} color={colors.success} />
            <Text style={[s.altAddText, { color: colors.success }]}>+ plat</Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── WeekSlide ─────────────────────────────────────────────────────────────────

type WeekSlideProps = {
  weekStart: string;
  plan: WeekPlan;
  dishById: Map<string, Dish>;
  sourceDishes: Dish[];
  isPast: boolean;
  isCurrent: boolean;
  onSlotPress: (ref: SlotRef) => void;
  onSlotLongPress: (ref: SlotRef) => void;
  selectedSlots: Set<string>;
  swapSource: SlotRef | null;
  flashedSlots: Set<string>;
  selectMode: boolean;
  dishSource: DishSource;
  onSourceChange: (s: DishSource) => void;
  onRandomize: () => void;
  onToggleSelect: () => void;
  onClear: () => void;
  onAddAlt: (ref: SlotRef) => void;
  onRemoveAlt: (ref: SlotRef) => void;
  categoryEmojiFor: (dish: Dish) => string;
};

function WeekSlide({
  weekStart, plan, dishById, sourceDishes, isPast, isCurrent,
  onSlotPress, onSlotLongPress, selectedSlots, swapSource, flashedSlots,
  selectMode, dishSource, onSourceChange, onRandomize, onToggleSelect, onClear,
  onAddAlt, onRemoveAlt, categoryEmojiFor,
}: WeekSlideProps) {
  const { colors } = useTheme();
  const days = weekDays(weekStart);
  const filled = Object.values(plan).reduce((acc, d) => acc + Object.values(d).filter((e) => e?.main).length, 0);
  const total = DAYS_FR.length * SLOTS.length;

  return (
    <ScrollView style={{ width: SCREEN_WIDTH }} contentContainerStyle={s.slideContent} showsVerticalScrollIndicator={false}>

      {/* En-tête semaine */}
      <View style={[s.weekHeader, { backgroundColor: isCurrent ? colors.primaryGlow : colors.overlay, borderColor: isCurrent ? colors.primary + "44" : colors.border }]}>
        <View>
          <Text style={[s.weekHeaderLabel, { color: isCurrent ? colors.primary : colors.textSubtle }]}>
            {isCurrent ? "Semaine en cours" : isPast ? "Semaine passée" : "Semaine à venir"}
          </Text>
          <Text style={[s.weekHeaderDates, { color: colors.text }]}>{weekLabel(weekStart)}</Text>
        </View>
        <View style={[s.weekFillBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.weekFillText, { color: colors.textMuted }]}>{filled}/{total}</Text>
        </View>
      </View>

      {/* Toggle source + actions (seulement si non passé) */}
      {!isPast && (
        <>
          <View style={[s.sourceToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity onPress={() => onSourceChange("mine")} style={[s.sourceBtn, dishSource === "mine" && { backgroundColor: colors.primary }]}>
              <Ionicons name="restaurant-outline" size={13} color={dishSource === "mine" ? "#fff" : colors.textMuted} />
              <Text style={[s.sourceBtnText, { color: dishSource === "mine" ? "#fff" : colors.textMuted }]}>Mes plats</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSourceChange("app")} style={[s.sourceBtn, dishSource === "app" && { backgroundColor: colors.primary }]}>
              <Ionicons name="book-outline" size={13} color={dishSource === "app" ? "#fff" : colors.textMuted} />
              <Text style={[s.sourceBtnText, { color: dishSource === "app" ? "#fff" : colors.textMuted }]}>Recettes app</Text>
            </TouchableOpacity>
          </View>

          <View style={s.actions}>
            <Button title={selectedSlots.size > 0 ? `Regénérer (${selectedSlots.size})` : "Générer"} icon="shuffle" onPress={onRandomize} disabled={sourceDishes.length === 0} style={{ flex: 1, height: 44 }} />
            <TouchableOpacity onPress={onToggleSelect} style={[s.iconBtn, { backgroundColor: selectMode ? colors.primaryGlow : colors.card, borderColor: selectMode ? colors.primary : colors.border }]}>
              <Ionicons name={selectMode ? "checkmark-circle" : "calendar-outline"} size={20} color={selectMode ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClear} style={[s.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Grille */}
      <View style={s.grid}>
        {DAYS_FR.map((_, day) => {
          const date = days[day];
          const dateStr = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          const entry = plan[day]?.[("lunch" as MealSlot)];
          const _2 = entry; // just to use entry for type narrowing below
          return (
            <View key={day} style={[s.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={s.dayLabelRow}>
                <Text style={[s.dayLabel, { color: colors.textMuted }]}>{DAYS_FR[day]}</Text>
                <Text style={[s.dayDate, { color: colors.textSubtle }]}>{dateStr}</Text>
              </View>
              <View style={s.slotsRow}>
                {SLOTS.map((slot) => {
                  const slotEntry = plan[day]?.[slot.key];
                  const mainDish = slotEntry?.main ? dishById.get(slotEntry.main) : undefined;
                  const altDish = slotEntry?.alt ? dishById.get(slotEntry.alt) : undefined;
                  const isRecipeSlot = !!slotEntry?.main?.startsWith("recipe-");
                  const key = slotKey(day, slot.key);
                  const ref: SlotRef = { weekStart, day, slot: slot.key, kind: "main" };
                  return (
                    <AnimatedSlot
                      key={slot.key}
                      entry={slotEntry}
                      slotLabel={slot.label}
                      mainName={mainDish?.name}
                      altName={altDish?.name}
                      mainEmoji={mainDish ? categoryEmojiFor(mainDish) : undefined}
                      altEmoji={altDish ? categoryEmojiFor(altDish) : undefined}
                      isRecipeSlot={isRecipeSlot}
                      isSelected={selectedSlots.has(key)}
                      isSwapSource={swapSource?.weekStart === weekStart && swapSource?.day === day && swapSource?.slot === slot.key}
                      flash={flashedSlots.has(key)}
                      isPast={isPast}
                      onPress={() => onSlotPress(ref)}
                      onLongPress={() => onSlotLongPress(ref)}
                      onAddAlt={() => onAddAlt({ ...ref, kind: "alt" })}
                      onRemoveAlt={() => onRemoveAlt({ ...ref, kind: "alt" })}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function WeekScreen() {
  const myDishes = useDishStore((s) => s.dishes);
  const plans = useWeekStore((s) => s.plans);
  const setSlot = useWeekStore((s) => s.setSlot);
  const randomize = useWeekStore((s) => s.randomize);
  const clearWeek = useWeekStore((s) => s.clearWeek);
  const categories = useCategoryStore((s) => s.categories);
  const { colors } = useTheme();

  const categoryEmojiFor = useCallback((dish: Dish): string => {
    if (dish.categoryId) {
      const cat = categories.find((c) => c.id === dish.categoryId);
      if (cat) return cat.emoji;
    }
    // Fallback : détection automatique → emoji de la catégorie par défaut
    const key = detectDishCategory(dish);
    const defaults: Record<string, string> = {
      viande: "🥩", poisson: "🐟", végé: "🥗", pâtes: "🍝", soupe: "🍲", autre: "🍽️",
    };
    return defaults[key] ?? "🍽️";
  }, [categories]);

  const scrollRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(INITIAL_INDEX);

  const [pickerSlot, setPickerSlot] = useState<SlotRef | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [swapSource, setSwapSource] = useState<SlotRef | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [flashedSlots, setFlashedSlots] = useState<Set<string>>(new Set());
  const [dishSource, setDishSource] = useState<DishSource>("mine");

  const sourceDishes = dishSource === "app" ? RECIPE_DISHES : myDishes;

  const dishById = useMemo(() => {
    const map = new Map(myDishes.map((d) => [d.id, d]));
    RECIPE_DISHES.forEach((d) => map.set(d.id, d));
    return map;
  }, [myDishes]);

  // Scroll vers la semaine courante au montage
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: INITIAL_INDEX * SCREEN_WIDTH, animated: false });
    }, 50);
  }, []);

  const triggerFlash = useCallback((keys: string[]) => {
    setFlashedSlots(new Set(keys));
    setTimeout(() => setFlashedSlots(new Set()), 700);
  }, []);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (idx !== currentSlide) {
      setCurrentSlide(idx);
      setSelectedSlots(new Set());
      setSelectMode(false);
      setSwapSource(null);
    }
  }, [currentSlide]);

  // ─── Actions par slide ───────────────────────────────────────────────────────

  const handleRandomize = async (weekStart: string) => {
    if (sourceDishes.length === 0) return;
    const plan = plans[weekStart] ?? {};

    if (selectedSlots.size > 0) {
      const current = { ...plan };
      for (const key of selectedSlots) {
        const [dayStr, slot] = key.split("-") as [string, MealSlot];
        const day = Number(dayStr);
        const currentMain = current[day]?.[slot]?.main;
        current[day] = { ...(current[day] ?? {}) };
        current[day][slot] = { ...(current[day][slot] ?? {}), main: randomDishId(sourceDishes, currentMain) };
      }
      useWeekStore.getState().setSlotBulk(weekStart, current);
      triggerFlash([...selectedSlots]);
      setSelectedSlots(new Set());
      setSelectMode(false);
      return;
    }

    const filled = Object.values(plan).some((d) => Object.values(d).some((e) => e?.main));
    if (filled) {
      const ok = await confirm("Générer un nouveau menu", "Cela remplacera le menu actuel.");
      if (!ok) return;
    }
    randomize(weekStart, sourceDishes);
    const allKeys = DAYS_FR.flatMap((_, day) => SLOTS.map((sl) => slotKey(day, sl.key)));
    triggerFlash(allKeys);
  };

  const handleClear = async (weekStart: string) => {
    const ok = await confirm("Vider la semaine", "Effacer tous les plats de cette semaine ?");
    if (ok) clearWeek(weekStart);
  };

  // ─── Tap sur un créneau ──────────────────────────────────────────────────────

  const handleSlotPress = (ref: SlotRef) => {
    if (selectMode) {
      const key = slotKey(ref.day, ref.slot);
      setSelectedSlots((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
      return;
    }

    if (swapSource) {
      if (swapSource.weekStart === ref.weekStart && swapSource.day === ref.day && swapSource.slot === ref.slot) {
        setSwapSource(null); return;
      }
      const weekStart = ref.weekStart;
      const plan = { ...(plans[weekStart] ?? {}) };
      const srcMain = plan[swapSource.day]?.[swapSource.slot]?.main;
      const dstMain = plan[ref.day]?.[ref.slot]?.main;
      plan[swapSource.day] = { ...(plan[swapSource.day] ?? {}) };
      plan[ref.day] = { ...(plan[ref.day] ?? {}) };
      const srcEntry = { ...(plan[swapSource.day][swapSource.slot] ?? {}) };
      const dstEntry = { ...(plan[ref.day][ref.slot] ?? {}) };
      if (dstMain) srcEntry.main = dstMain; else delete srcEntry.main;
      if (srcMain) dstEntry.main = srcMain; else delete dstEntry.main;
      plan[swapSource.day][swapSource.slot] = srcEntry;
      plan[ref.day][ref.slot] = dstEntry;
      useWeekStore.getState().setSlotBulk(weekStart, plan);
      triggerFlash([slotKey(swapSource.day, swapSource.slot), slotKey(ref.day, ref.slot)]);
      setSwapSource(null);
      return;
    }

    setPickerSlot(ref);
  };

  const handleSlotLongPress = (ref: SlotRef) => {
    if (selectMode) return;
    const plan = plans[ref.weekStart] ?? {};
    if (!plan[ref.day]?.[ref.slot]?.main) return;
    setSwapSource(ref);
  };

  const weekStart = WEEK_STARTS[currentSlide];
  const pickerDishes = pickerSlot?.kind === "alt" ? myDishes : sourceDishes;
  const modalTitle = pickerSlot
    ? `${DAYS_FR[pickerSlot.day]} — ${SLOTS.find((s) => s.key === pickerSlot.slot)?.label}${pickerSlot.kind === "alt" ? " · Variante" : ""}`
    : "";

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Indicateurs de pagination */}
      <View style={[s.pagination, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => {
            if (currentSlide > 0) {
              const prev = currentSlide - 1;
              scrollRef.current?.scrollTo({ x: prev * SCREEN_WIDTH, animated: true });
              setCurrentSlide(prev);
            }
          }}
          hitSlop={12}
          disabled={currentSlide === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentSlide === 0 ? colors.textSubtle : colors.text} />
        </TouchableOpacity>

        <View style={s.dots}>
          {WEEK_STARTS.map((ws, i) => {
            const isCur = ws === currentWeekStart();
            return (
              <TouchableOpacity
                key={ws}
                onPress={() => scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true })}
              >
                <View style={[
                  s.dot,
                  { backgroundColor: i === currentSlide ? colors.primary : colors.border },
                  isCur && i !== currentSlide && { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: "transparent" },
                  i === currentSlide && { width: 20 },
                ]} />
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          onPress={() => {
            if (currentSlide < TOTAL - 1) {
              const next = currentSlide + 1;
              scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
              setCurrentSlide(next);
            }
          }}
          hitSlop={12}
          disabled={currentSlide === TOTAL - 1}
        >
          <Ionicons name="chevron-forward" size={20} color={currentSlide === TOTAL - 1 ? colors.textSubtle : colors.text} />
        </TouchableOpacity>
      </View>

      {/* Carrousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {WEEK_STARTS.map((ws, i) => {
          const isPast = i < INITIAL_INDEX;
          const isCurrent = i === INITIAL_INDEX;
          return (
            <WeekSlide
              key={ws}
              weekStart={ws}
              plan={plans[ws] ?? {}}
              dishById={dishById}
              sourceDishes={sourceDishes}
              isPast={isPast}
              isCurrent={isCurrent}
              onSlotPress={handleSlotPress}
              onSlotLongPress={handleSlotLongPress}
              selectedSlots={currentSlide === i ? selectedSlots : new Set()}
              swapSource={currentSlide === i ? swapSource : null}
              flashedSlots={currentSlide === i ? flashedSlots : new Set()}
              selectMode={selectMode}
              dishSource={dishSource}
              onSourceChange={setDishSource}
              onRandomize={() => handleRandomize(ws)}
              onToggleSelect={() => {
                setSelectMode((v) => !v);
                setSelectedSlots(new Set());
                setSwapSource(null);
              }}
              onClear={() => handleClear(ws)}
              onAddAlt={(ref) => setPickerSlot(ref)}
              onRemoveAlt={(ref) => {
                setSlot(ref.weekStart, ref.day, ref.slot, "alt", undefined);
                triggerFlash([slotKey(ref.day, ref.slot)]);
              }}
              categoryEmojiFor={categoryEmojiFor}
            />
          );
        })}
      </ScrollView>

      <DishPickerModal
        visible={pickerSlot != null}
        dishes={pickerDishes}
        title={modalTitle}
        onSelect={(dishId) => {
          if (pickerSlot) {
            setSlot(pickerSlot.weekStart, pickerSlot.day, pickerSlot.slot, pickerSlot.kind, dishId);
            triggerFlash([slotKey(pickerSlot.day, pickerSlot.slot)]);
          }
          setPickerSlot(null);
        }}
        onClear={() => {
          if (pickerSlot) setSlot(pickerSlot.weekStart, pickerSlot.day, pickerSlot.slot, pickerSlot.kind, undefined);
          setPickerSlot(null);
        }}
        onClose={() => setPickerSlot(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  slideContent: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  weekHeaderLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  weekHeaderDates: { fontSize: 14, fontWeight: "600" },
  weekFillBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  weekFillText: { fontSize: 12, fontWeight: "600" },
  sourceToggle: { flexDirection: "row", borderRadius: radius.md, borderWidth: 1, padding: 3, gap: 3 },
  sourceBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: 8, borderRadius: radius.sm },
  sourceBtnText: { fontSize: 13, fontWeight: "600" },
  actions: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  iconBtn: { width: 44, height: 44, borderRadius: radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  grid: { gap: spacing.sm },
  dayCard: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md },
  dayLabelRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: spacing.sm },
  dayLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  dayDate: { fontSize: 11 },
  slotsRow: { flexDirection: "row", gap: spacing.sm },
  slot: { flex: 1, minHeight: 64, borderRadius: radius.sm, padding: spacing.sm, gap: 4 },
  slotHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  slotLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  recipeBadge: { width: 14, height: 14, borderRadius: 3, alignItems: "center", justifyContent: "center" },
  slotDishRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  slotEmoji: { fontSize: 12, lineHeight: 16 },
  slotDish: { fontSize: 13, fontWeight: "500" },
  slotDishEmpty: { fontStyle: "italic", fontWeight: "400" },
  altChip: { flexDirection: "row", alignItems: "center", gap: 3, alignSelf: "flex-start", borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 2, marginTop: 2 },
  altEmoji: { fontSize: 9 },
  altChipText: { fontSize: 10, fontWeight: "500", maxWidth: 72 },
  altAdd: { flexDirection: "row", alignItems: "center", gap: 2, alignSelf: "flex-start", borderWidth: 1, borderStyle: "dashed", borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 2, marginTop: 2 },
  altAddText: { fontSize: 10 },
});
