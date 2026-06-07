import { useMemo, useState } from "react";
import {
  Pressable, SectionList, ScrollView,
  StyleSheet, Text, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ShoppingItem, WeekPlan } from "@/types/models";
import { useDishStore } from "@/store/useDishStore";
import { useWeekStore } from "@/store/useWeekStore";
import { useShoppingStore } from "@/store/useShoppingStore";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";
import { currentWeekStart, weekLabel } from "@/lib/weekDates";
import { detectIngredientCategory, INGREDIENT_CATEGORIES, INGREDIENT_CATEGORY_MAP } from "@/lib/ingredientCategory";
import { buildShoppingList } from "@/lib/shoppingList";

type Section = { key: string; title: string; icon: string; data: ShoppingItem[] };

function groupByCategory(items: ShoppingItem[]): Section[] {
  const byCategory = new Map<string, ShoppingItem[]>();
  for (const item of items) {
    const catKey = detectIngredientCategory(item.label);
    if (!byCategory.has(catKey)) byCategory.set(catKey, []);
    byCategory.get(catKey)!.push(item);
  }
  const orderedKeys = [...INGREDIENT_CATEGORIES.map((c) => c.key), "autres" as const];
  return orderedKeys
    .filter((key) => byCategory.has(key))
    .map((key) => {
      const def = INGREDIENT_CATEGORY_MAP.get(key)!;
      return {
        key,
        title: def.label,
        icon: def.icon,
        data: byCategory.get(key)!.sort((a, b) => a.label.localeCompare(b.label, "fr")),
      };
    });
}

// ─── Vue liste unique ──────────────────────────────────────────────────────────

function SingleShoppingView() {
  const { colors } = useTheme();
  const dishes = useDishStore((s) => s.dishes);
  const plans = useWeekStore((s) => s.plans);
  const plan = plans[currentWeekStart()] ?? {};
  const storedItems = useShoppingStore((s) => s.items);
  const toggle = useShoppingStore((s) => s.toggle);
  const addManual = useShoppingStore((s) => s.addManual);
  const remove = useShoppingStore((s) => s.remove);

  const [newItem, setNewItem] = useState("");

  // Fusionne les ingrédients générés depuis le plan avec l'état coché du store
  const items = useMemo(() => {
    const generated = buildShoppingList(plan, dishes);
    const storedById = new Map(storedItems.map((i) => [i.id, i]));
    const mergedGenerated = generated.map((g) => ({
      ...g,
      checked: storedById.get(g.id)?.checked ?? false,
    }));
    const manual = storedItems.filter((i) => i.manual);
    return [...mergedGenerated, ...manual];
  }, [plan, dishes, storedItems]);

  const remaining = useMemo(() => items.filter((i) => !i.checked).length, [items]);
  const total = items.length;
  const progress = total > 0 ? (total - remaining) / total : 0;
  const sections = useMemo(() => groupByCategory(items), [items]);
  const handleAdd = () => { addManual(newItem); setNewItem(""); };

  return (
    <View style={{ flex: 1 }}>
      {total > 0 && (
        <View style={[s.topSection, { borderBottomColor: colors.border }]}>
          <View style={s.progressBlock}>
            <View style={s.progressHeader}>
              <Text style={[s.progressLabel, { color: colors.textMuted }]}>{remaining} restant{remaining > 1 ? "s" : ""}</Text>
              <Text style={[s.progressPct, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={[s.progressTrack, { backgroundColor: colors.overlay }]}>
              <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[s.list, { flexGrow: 1 }]}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={[s.sectionHeader, { backgroundColor: colors.bg }]}>
            <View style={[s.sectionIconWrap, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name={section.icon as never} size={14} color={colors.primary} />
            </View>
            <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
            <View style={[s.sectionLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        renderItem={({ item }) => <ShoppingRow item={item} onToggle={() => toggle(item.id)} onRemove={() => remove(item.id)} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={[s.emptyIcon, { backgroundColor: colors.primaryGlow, borderColor: colors.primary + "33" }]}>
              <Ionicons name="cart-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.text }]}>Liste vide</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Composez votre semaine dans l'onglet Semaine, la liste se met à jour automatiquement.</Text>
          </View>
        }
      />

      <View style={[s.addBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput style={[s.addInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={newItem} onChangeText={setNewItem} placeholder="Ajouter un article…" placeholderTextColor={colors.textSubtle} onSubmitEditing={handleAdd} returnKeyType="done" />
        <Pressable style={[s.addBtn, { backgroundColor: colors.primary }, !newItem.trim() && s.addBtnDisabled]} onPress={handleAdd} disabled={!newItem.trim()}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Vue carrousel multi-semaines ──────────────────────────────────────────────

function MultiWeekShoppingView({ filledWeeks }: { filledWeeks: string[] }) {
  const { colors } = useTheme();
  const dishes = useDishStore((s) => s.dishes);
  const plans = useWeekStore((s) => s.plans);
  const storedItems = useShoppingStore((s) => s.items);
  const toggle = useShoppingStore((s) => s.toggle);
  const addManual = useShoppingStore((s) => s.addManual);
  const remove = useShoppingStore((s) => s.remove);
  const [currentTab, setCurrentTab] = useState(0);
  const [newItem, setNewItem] = useState("");

  const weekStart = filledWeeks[currentTab];
  const plan: WeekPlan = plans[weekStart] ?? {};

  const items = useMemo(() => {
    const generated = buildShoppingList(plan, dishes);
    const storedById = new Map(storedItems.map((i) => [i.id, i]));
    const mergedGenerated = generated.map((g) => ({
      ...g,
      id: `${weekStart}:${g.id}`,
      checked: storedById.get(`${weekStart}:${g.id}`)?.checked ?? false,
    }));
    const manual = storedItems.filter((i) => i.manual);
    return [...mergedGenerated, ...manual];
  }, [plan, dishes, storedItems, weekStart]);

  const sections = useMemo(() => groupByCategory(items), [items]);
  const total = items.filter((i) => !i.manual).length;
  const remaining = items.filter((i) => !i.manual && !i.checked).length;
  const progress = total > 0 ? (total - remaining) / total : 0;

  const handleAdd = () => { addManual(newItem); setNewItem(""); };

  return (
    <View style={{ flex: 1 }}>
      {/* Tabs semaines */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.weekTabs, { borderBottomColor: colors.border, backgroundColor: colors.surface }]} contentContainerStyle={s.weekTabsList}>
        {filledWeeks.map((ws, i) => {
          const isCur = ws === currentWeekStart();
          const active = i === currentTab;
          return (
            <Pressable key={ws} onPress={() => setCurrentTab(i)} style={[s.weekTab, active && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
              <Text style={[s.weekTabText, { color: active ? colors.primary : colors.textMuted, fontWeight: active ? "700" : "500" }]}>
                {isCur ? "Cette semaine" : weekLabel(ws).split("–")[0].trim()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {total > 0 && (
        <View style={[s.topSection, { borderBottomColor: colors.border }]}>
          <View style={s.progressBlock}>
            <View style={s.progressHeader}>
              <Text style={[s.progressLabel, { color: colors.textMuted }]}>{remaining} restant{remaining > 1 ? "s" : ""}</Text>
              <Text style={[s.progressPct, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
            </View>
            <View style={[s.progressTrack, { backgroundColor: colors.overlay }]}>
              <View style={[s.progressFill, { width: `${progress * 100}%` as any, backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={[s.list, { flexGrow: 1 }]}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={[s.sectionHeader, { backgroundColor: colors.bg }]}>
            <View style={[s.sectionIconWrap, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name={section.icon as never} size={14} color={colors.primary} />
            </View>
            <Text style={[s.sectionTitle, { color: colors.textMuted }]}>{section.title}</Text>
            <View style={[s.sectionLine, { backgroundColor: colors.border }]} />
          </View>
        )}
        renderItem={({ item }) => <ShoppingRow item={item} onToggle={() => toggle(item.id)} onRemove={() => remove(item.id)} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Aucun ingrédient pour cette semaine.</Text>
          </View>
        }
      />

      <View style={[s.addBar, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput style={[s.addInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]} value={newItem} onChangeText={setNewItem} placeholder="Ajouter un article…" placeholderTextColor={colors.textSubtle} returnKeyType="done" onSubmitEditing={handleAdd} />
        <Pressable style={[s.addBtn, { backgroundColor: colors.primary }, !newItem.trim() && s.addBtnDisabled]} onPress={handleAdd} disabled={!newItem.trim()}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Composant partagé ─────────────────────────────────────────────────────────

function ShoppingRow({ item, onToggle, onRemove }: { item: ShoppingItem; onToggle: () => void; onRemove: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }, item.checked && s.rowChecked]}>
      <Pressable style={s.rowMain} onPress={onToggle}>
        <View style={[s.checkbox, { borderColor: colors.borderStrong }, item.checked && { backgroundColor: colors.success, borderColor: colors.success }]}>
          {item.checked && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={[s.rowLabel, { color: colors.text }, item.checked && { textDecorationLine: "line-through", color: colors.textSubtle }]}>{item.label}</Text>
        {item.manual && <View style={[s.manualDot, { backgroundColor: colors.primary }]} />}
      </Pressable>
      <Pressable onPress={onRemove} hitSlop={10} style={s.removeBtn}>
        <Ionicons name="close" size={16} color={colors.textSubtle} />
      </Pressable>
    </View>
  );
}

// ─── Écran principal ───────────────────────────────────────────────────────────

export default function ShoppingScreen() {
  const plans = useWeekStore((s) => s.plans);

  const filledWeeks = useMemo(() => {
    return Object.entries(plans)
      .filter(([, plan]) => Object.values(plan).some((d) => Object.values(d).some((e) => e?.main)))
      .map(([ws]) => ws)
      .sort();
  }, [plans]);

  const isMultiWeek = filledWeeks.length >= 2;

  if (isMultiWeek) {
    return <MultiWeekShoppingView filledWeeks={filledWeeks} />;
  }
  return <SingleShoppingView />;
}

const s = StyleSheet.create({
  topSection: { padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.md, borderBottomWidth: 1 },
  progressBlock: { gap: spacing.xs },
  progressHeader: { flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: 13, fontWeight: "500" },
  progressPct: { fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  weekTabs: { borderBottomWidth: 1, height: 48, flexShrink: 0 },
  weekTabsList: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg },
  weekTab: { height: 48, justifyContent: "center", paddingHorizontal: spacing.sm, marginRight: spacing.md },
  weekTabText: { fontSize: 14 },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, marginTop: spacing.xs },
  sectionIconWrap: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionLine: { flex: 1, height: 1 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: radius.md, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.xs },
  rowChecked: { opacity: 0.5 },
  rowMain: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.md },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 14, flex: 1 },
  manualDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  removeBtn: { paddingLeft: spacing.sm },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: spacing.sm },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm, borderWidth: 1 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", paddingHorizontal: spacing.xl, lineHeight: 20 },
  addBar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1 },
  addInput: { flex: 1, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 14, letterSpacing: 0 },
  addBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  addBtnDisabled: { opacity: 0.4 },
});
