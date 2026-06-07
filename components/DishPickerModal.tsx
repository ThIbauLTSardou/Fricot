import { useMemo, useState } from "react";
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Dish } from "@/types/models";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";
import { DISH_CATEGORIES, detectDishCategory, type DishCategory } from "@/lib/dishCategory";

type Props = {
  visible: boolean;
  dishes: Dish[];
  title: string;
  onSelect: (dishId: string) => void;
  onClear: () => void;
  onClose: () => void;
};

export function DishPickerModal({ visible, dishes, title, onSelect, onClear, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DishCategory>("tous");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return dishes.filter((d) => {
      if (category !== "tous" && detectDishCategory(d) !== category) return false;
      if (!q) return true;
      const name = d.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
      const ingrs = d.ingredients.map((i) => i.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")).join(" ");
      return name.includes(q) || ingrs.includes(q);
    });
  }, [dishes, query, category]);

  const handleClose = () => {
    setQuery("");
    setCategory("tous");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={s.backdrop} onPress={handleClose} />
      <View
        style={[
          s.sheet,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
      >
        <View style={[s.handle, { backgroundColor: colors.borderStrong }]} />

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.headerLabel, { color: colors.textSubtle }]}>Choisir un plat</Text>
            <Text style={[s.headerTitle, { color: colors.text }]}>{title}</Text>
          </View>
          <Pressable
            onPress={handleClose}
            style={[s.closeBtn, { backgroundColor: colors.overlay, borderColor: colors.border }]}
            hitSlop={10}
          >
            <Ionicons name="close" size={20} color={colors.textMuted} />
          </Pressable>
        </View>

        {/* Recherche */}
        <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={15} color={colors.textSubtle} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher…"
            placeholderTextColor={colors.textSubtle}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color={colors.textSubtle} />
            </Pressable>
          )}
        </View>

        {/* Filtres catégories */}
        <FlatList
          horizontal
          data={DISH_CATEGORIES}
          keyExtractor={(c) => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.catList}
          style={s.catBar}
          renderItem={({ item }) => {
            const active = category === item.key;
            return (
              <TouchableOpacity
                onPress={() => setCategory(item.key)}
                style={[
                  s.catChip,
                  {
                    backgroundColor: active ? colors.primary : colors.overlay,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[s.catLabel, { color: active ? "#fff" : colors.textMuted }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* Liste */}
        {dishes.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="fast-food-outline" size={32} color={colors.textSubtle} />
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              Aucun plat enregistré.{"\n"}Ajoutez-en dans « Mes plats ».
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.empty}>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Aucun plat ne correspond.</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(d) => d.id}
            style={s.list}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing.xs }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  s.row,
                  {
                    backgroundColor: pressed ? colors.cardHover : colors.card,
                    borderColor: pressed ? colors.borderStrong : colors.border,
                  },
                ]}
                onPress={() => {
                  setQuery("");
                  setCategory("tous");
                  onSelect(item.id);
                }}
              >
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={s.rowImg} resizeMode="cover" />
                ) : (
                  <View style={[s.rowImgPlaceholder, { backgroundColor: colors.primaryGlow }]}>
                    <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[s.rowText, { color: colors.text }]}>{item.name}</Text>
                  {item.ingredients.length > 0 && (
                    <Text style={[s.rowIngrs, { color: colors.textMuted }]} numberOfLines={1}>
                      {item.ingredients.slice(0, 3).map((i) => i.name).join(", ")}
                      {item.ingredients.length > 3 ? ` +${item.ingredients.length - 3}` : ""}
                    </Text>
                  )}
                </View>
                <Text style={[s.rowMeta, { color: colors.textMuted }]}>{item.servings} pers.</Text>
              </Pressable>
            )}
          />
        )}

        {/* Vider le créneau */}
        <Pressable style={[s.clearRow, { borderTopColor: colors.border }]} onPress={onClear}>
          <Ionicons name="close-circle-outline" size={16} color={colors.danger} />
          <Text style={[s.clearText, { color: colors.danger }]}>Vider ce créneau</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    maxHeight: "85%",
  },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  headerTitle: { fontSize: 16, fontWeight: "700" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 14 },
  catBar: { height: 48, marginBottom: spacing.sm },
  catList: { gap: spacing.xs, alignItems: "center", paddingVertical: 4 },
  catChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  catLabel: { fontSize: 12, fontWeight: "500" },
  divider: { height: 1, marginBottom: spacing.sm },
  empty: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: { textAlign: "center", fontSize: 13, lineHeight: 20 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    gap: spacing.md,
  },
  rowImg: { width: 64, height: 64 },
  rowImgPlaceholder: { width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  rowText: { fontSize: 14, fontWeight: "500", paddingRight: spacing.sm },
  rowIngrs: { fontSize: 11, marginTop: 2, paddingRight: spacing.sm },
  rowMeta: { fontSize: 12, paddingRight: spacing.md },
  clearRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  clearText: { fontWeight: "600", fontSize: 13 },
});
