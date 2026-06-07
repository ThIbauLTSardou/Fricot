import { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDishStore } from "@/store/useDishStore";
import { useCategoryStore, DEFAULT_CATEGORIES } from "@/store/useCategoryStore";
import { detectDishCategory } from "@/lib/dishCategory";
import { useTheme } from "@/lib/ThemeContext";
import { fontFamily, radius, spacing } from "@/lib/theme";
import type { Dish, UserCategory } from "@/types/models";

// Palette de couleurs prédéfinies pour le sélecteur
const PALETTE = [
  "#e8574a", "#e8a44a", "#e8d44a", "#4ab86a", "#4ac4e8",
  "#4a8ee8", "#8e4ae8", "#c44ae8", "#e8419a", "#878787",
];

const EMOJI_PRESETS = ["🥩","🐟","🥗","🍝","🍲","🍰","🍽️","🥘","🍜","🌮","🥙","🫕","🍛","🥞","🍱","🫙","🥗","🍖","🍗","🧆"];

// ─── Helpers ────────────────────────────────────────────────────────────────

// Mappe les catégories par défaut (id "default:xxx") vers les clés DishCategory
const DEFAULT_CAT_KEY: Record<string, string> = {
  "default:viande":  "viande",
  "default:poisson": "poisson",
  "default:vege":    "végé",
  "default:pates":   "pâtes",
  "default:soupe":   "soupe",
  "default:dessert": "autre",
  "default:autre":   "autre",
};

function getDishesForCategory(cat: UserCategory, allDishes: Dish[]): Dish[] {
  return allDishes.filter((d) => {
    // Catégorie explicitement assignée
    if (d.categoryId) return d.categoryId === cat.id;
    // Plat sans catégorie : utiliser la détection auto, mais seulement pour les catégories par défaut
    const defaultKey = DEFAULT_CAT_KEY[cat.id];
    if (!defaultKey) return false;
    return detectDishCategory(d) === defaultKey;
  });
}

// ─── CategoryGrid ────────────────────────────────────────────────────────────

type GridProps = {
  categories: UserCategory[];
  dishes: Dish[];
  onSelect: (cat: UserCategory) => void;
  onEdit: (cat: UserCategory) => void;
  onAdd: () => void;
};

const ALL_CATEGORY: UserCategory = { id: "all", name: "Tous", emoji: "🍽️", color: "#e8419a", isDefault: true };

function CategoryGrid({ categories, dishes, onSelect, onEdit, onAdd }: GridProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[s.grid, { paddingBottom: insets.bottom + 80 }]}
    >
      {/* Carte "Tous" — pleine largeur */}
      <Pressable
        style={({ pressed }) => [
          s.catCardFull,
          { backgroundColor: pressed ? colors.cardHover : colors.card, borderColor: colors.border },
        ]}
        onPress={() => onSelect(ALL_CATEGORY)}
      >
        <View style={[s.catCardFullBanner, { backgroundColor: colors.primaryGlow }]}>
          <Text style={s.catCardEmoji}>🍽️</Text>
        </View>
        <View style={[s.catCardBody, { flex: 1 }]}>
          <Text style={[s.catCardName, { color: colors.text }]}>Tous les plats</Text>
          <Text style={[s.catCardCount, { color: colors.textMuted }]}>
            {dishes.length} plat{dishes.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} style={{ marginRight: spacing.md }} />
      </Pressable>

      {categories.map((cat) => {
        const catDishes = getDishesForCategory(cat, dishes);
        return (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [
              s.catCard,
              {
                backgroundColor: pressed ? colors.cardHover : colors.card,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onSelect(cat)}
            onLongPress={() => onEdit(cat)}
          >
            {/* Bandeau : toujours l'emoji de la catégorie */}
            <View style={[s.catCardBanner, { backgroundColor: cat.color + "33" }]}>
              <Text style={s.catCardEmoji}>{cat.emoji}</Text>
            </View>
            <View style={s.catCardBody}>
              <Text style={[s.catCardName, { color: colors.text }]} numberOfLines={1}>
                {cat.name}
              </Text>
              <Text style={[s.catCardCount, { color: colors.textMuted }]}>
                {catDishes.length} plat{catDishes.length !== 1 ? "s" : ""}
              </Text>
            </View>
            <Pressable
              style={s.catEditBtn}
              hitSlop={8}
              onPress={() => onEdit(cat)}
            >
              <Ionicons name="ellipsis-horizontal" size={14} color={colors.textSubtle} />
            </Pressable>
          </Pressable>
        );
      })}

      {/* Carte "Ajouter une catégorie" */}
      <Pressable
        style={({ pressed }) => [
          s.catCard,
          s.catCardAdd,
          {
            backgroundColor: pressed ? colors.cardHover : colors.card,
            borderColor: colors.border,
            borderStyle: "dashed",
          },
        ]}
        onPress={onAdd}
      >
        <Ionicons name="add" size={28} color={colors.textSubtle} />
        <Text style={[s.catCardAddText, { color: colors.textSubtle }]}>
          Nouvelle catégorie
        </Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── DishList (vue filtrée par catégorie) ────────────────────────────────────

type DishListProps = {
  category: UserCategory;
  dishes: Dish[];
  allDishes: Dish[];
  onBack: () => void;
  onEditCat: () => void;
};

function DishList({ category, dishes, allDishes, onBack, onEditCat }: DishListProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return dishes
      .filter((d) => {
        if (!q) return true;
        const name = d.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
        return name.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [dishes, query]);

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.listHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <Pressable onPress={onBack} hitSlop={8} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={[s.catHeaderEmojiBg, { backgroundColor: category.color + "33" }]}>
          <Text style={s.catHeaderEmoji}>{category.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[s.listHeaderTitle, { color: colors.text }]}>{category.name}</Text>
          <Text style={[s.listHeaderSub, { color: colors.textMuted }]}>
            {dishes.length} plat{dishes.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {category.id !== "all" && (
          <Pressable hitSlop={8} onPress={onEditCat} style={s.headerEditBtn}>
            <Ionicons name="create-outline" size={18} color={colors.textSubtle} />
          </Pressable>
        )}
      </View>

      {/* Recherche */}
      <View style={[s.searchRow, { borderBottomColor: colors.border }]}>
        <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSubtle} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher…"
            placeholderTextColor={colors.textSubtle}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSubtle} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={[s.list, { flexGrow: 1, paddingBottom: insets.bottom + 80 }]}
        renderItem={({ item }) => (
          <DishRow dish={item} onPress={() => router.push(`/(tabs)/dish/${item.id}`)} />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            {dishes.length === 0 ? (
              <>
                <Text style={[s.emptyEmoji]}>{category.emoji}</Text>
                <Text style={[s.emptyTitle, { color: colors.text }]}>Aucun plat dans cette catégorie</Text>
                <Text style={[s.emptyText, { color: colors.textMuted }]}>
                  Ajoutez un plat et assignez-lui la catégorie « {category.name} ».
                </Text>
              </>
            ) : (
              <Text style={[s.emptyText, { color: colors.textMuted }]}>Aucun plat ne correspond.</Text>
            )}
          </View>
        }
      />

      <Pressable
        onPress={() => router.push("/(tabs)/dish/new")}
        style={[
          s.fab,
          { bottom: insets.bottom + spacing.md, backgroundColor: colors.primary },
          Platform.select({ web: { boxShadow: "0 4px 16px rgba(232,65,154,0.4)" }, default: {} }),
        ]}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

// ─── DishRow ─────────────────────────────────────────────────────────────────

function DishRow({ dish, onPress }: { dish: Dish; onPress: () => void }) {
  const { colors } = useTheme();
  const ingrs = dish.ingredients
    .filter((i) => i.name.trim())
    .slice(0, 3)
    .map((i) => i.name)
    .join(", ");
  const extra = Math.max(0, dish.ingredients.filter((i) => i.name.trim()).length - 3);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.row,
        {
          backgroundColor: pressed ? colors.cardHover : colors.card,
          borderColor: pressed ? colors.borderStrong : colors.border,
        },
      ]}
    >
      {dish.imageUri ? (
        <Image source={{ uri: dish.imageUri }} style={[s.rowImg, { backgroundColor: colors.overlay }]} />
      ) : (
        <View style={[s.rowImg, s.rowImgPlaceholder, { backgroundColor: colors.overlay }]}>
          <Ionicons name="restaurant-outline" size={22} color={colors.textSubtle} />
        </View>
      )}
      <View style={s.rowBody}>
        <Text style={[s.rowName, { color: colors.text }]} numberOfLines={1}>
          {dish.name}
        </Text>
        <Text style={[s.rowIngrs, { color: colors.textMuted }]} numberOfLines={1}>
          {ingrs}{extra > 0 ? ` +${extra}` : ""}
        </Text>
      </View>
      <View style={s.rowRight}>
        <View style={[s.badge, { backgroundColor: colors.badgeBg }]}>
          <Text style={[s.badgeText, { color: colors.badgeText }]}>{dish.servings}p</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textSubtle} />
      </View>
    </Pressable>
  );
}

// ─── CategoryModal (CRUD) ─────────────────────────────────────────────────────

type CategoryModalProps = {
  visible: boolean;
  editing: UserCategory | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
};

function CategoryModal({ visible, editing, onClose, onDelete }: CategoryModalProps) {
  const { colors } = useTheme();
  const addCategory = useCategoryStore((s) => s.addCategory);
  const updateCategory = useCategoryStore((s) => s.updateCategory);

  const [name, setName] = useState(editing?.name ?? "");
  const [emoji, setEmoji] = useState(editing?.emoji ?? "🍽️");
  const [color, setColor] = useState(editing?.color ?? PALETTE[8]);
  const [saving, setSaving] = useState(false);

  // Reset state when modal opens/changes
  const prevEditing = useRef<UserCategory | null>(null);
  if (editing !== prevEditing.current) {
    prevEditing.current = editing;
    // Schedule reset after render
  }

  const reset = useCallback(() => {
    setName(editing?.name ?? "");
    setEmoji(editing?.emoji ?? "🍽️");
    setColor(editing?.color ?? PALETTE[8]);
    setSaving(false);
  }, [editing]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: name.trim(), emoji, color });
      } else {
        await addCategory({ name: name.trim(), emoji, color });
      }
      onClose();
    } catch {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editing || !onDelete) return;
    Alert.alert(
      "Supprimer la catégorie",
      `Supprimer « ${editing.name} » ? Les plats dans cette catégorie ne seront pas supprimés.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => { onDelete(editing.id); onClose(); },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={reset}
    >
      <Pressable style={s.modalBackdrop} onPress={onClose} />
      <View style={[s.modalSheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[s.modalHandle, { backgroundColor: colors.borderStrong }]} />

        <Text style={[s.modalTitle, { color: colors.text }]}>
          {editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
        </Text>

        {/* Preview */}
        <View style={s.modalPreview}>
          <View style={[s.modalPreviewCircle, { backgroundColor: color + "33" }]}>
            <Text style={s.modalPreviewEmoji}>{emoji}</Text>
          </View>
          <Text style={[s.modalPreviewName, { color: colors.text }]}>{name || "Nom…"}</Text>
        </View>

        {/* Nom */}
        <Text style={[s.modalLabel, { color: colors.textSubtle }]}>Nom</Text>
        <TextInput
          style={[s.modalInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
          value={name}
          onChangeText={setName}
          placeholder="Ex: Plats du monde"
          placeholderTextColor={colors.textSubtle}
          autoCorrect={false}
          maxLength={30}
        />

        {/* Emoji */}
        <Text style={[s.modalLabel, { color: colors.textSubtle }]}>Emoji</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.emojiRow} contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}>
          {EMOJI_PRESETS.map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => setEmoji(e)}
              style={[s.emojiBtn, emoji === e && { backgroundColor: color + "33", borderColor: color }]}
            >
              <Text style={s.emojiBtnText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Couleur */}
        <Text style={[s.modalLabel, { color: colors.textSubtle }]}>Couleur</Text>
        <View style={s.paletteRow}>
          {PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[s.paletteBtn, { backgroundColor: c }, color === c && s.paletteBtnActive]}
            >
              {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Actions */}
        <View style={s.modalActions}>
          {editing && !editing.isDefault && onDelete && (
            <Pressable onPress={handleDelete} style={[s.modalDeleteBtn, { borderColor: colors.danger + "44" }]}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          )}
          <Pressable
            onPress={onClose}
            style={[s.modalCancelBtn, { borderColor: colors.border, flex: 1 }]}
          >
            <Text style={[s.modalCancelText, { color: colors.textMuted }]}>Annuler</Text>
          </Pressable>
          <Pressable
            onPress={handleSave}
            disabled={!name.trim() || saving}
            style={[s.modalSaveBtn, { backgroundColor: colors.primary, flex: 2 }, (!name.trim() || saving) && { opacity: 0.5 }]}
          >
            <Text style={s.modalSaveText}>{saving ? "…" : "Enregistrer"}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DishesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dishes = useDishStore((s) => s.dishes);
  const categories = useCategoryStore((s) => s.categories);
  const removeCategory = useCategoryStore((s) => s.removeCategory);
  const { colors } = useTheme();

  const [selectedCat, setSelectedCat] = useState<UserCategory | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState<UserCategory | null>(null);

  const catDishes = useMemo(() => {
    if (!selectedCat) return [];
    if (selectedCat.id === "all") return [...dishes].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    return getDishesForCategory(selectedCat, dishes);
  }, [dishes, selectedCat]);

  const openAdd = () => {
    setEditingCat(null);
    setModalVisible(true);
  };

  const openEdit = (cat: UserCategory) => {
    setEditingCat(cat);
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    await removeCategory(id);
    if (selectedCat?.id === id) setSelectedCat(null);
  };

  if (selectedCat) {
    return (
      <>
        <DishList
          category={selectedCat}
          dishes={catDishes}
          allDishes={dishes}
          onBack={() => setSelectedCat(null)}
          onEditCat={() => openEdit(selectedCat)}
        />
        <CategoryModal
          visible={modalVisible}
          editing={editingCat}
          onClose={() => setModalVisible(false)}
          onDelete={handleDelete}
        />
      </>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      <CategoryGrid
        categories={categories}
        dishes={dishes}
        onSelect={setSelectedCat}
        onEdit={openEdit}
        onAdd={openAdd}
      />

      {dishes.length > 0 && (
        <Pressable
          onPress={() => router.push("/(tabs)/dish/new")}
          style={[
            s.fab,
            { bottom: insets.bottom + spacing.md, backgroundColor: colors.primary },
            Platform.select({ web: { boxShadow: "0 4px 16px rgba(232,65,154,0.4)" }, default: {} }),
          ]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </Pressable>
      )}

      <CategoryModal
        visible={modalVisible}
        editing={editingCat}
        onClose={() => setModalVisible(false)}
        onDelete={handleDelete}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  // Grid
  grid: {
    padding: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  catCard: {
    width: "47%",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  catCardFull: {
    width: "100%",
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
  },
  catCardFullBanner: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  catCardBanner: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  catCardImg: { width: "100%", height: "100%" },
  catCardEmoji: { fontSize: 36 },
  catCardBody: { padding: spacing.md, gap: 3 },
  catCardName: { fontSize: 14, fontWeight: "700" },
  catCardCount: { fontSize: 12 },
  catEditBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    padding: 4,
  },
  catCardAdd: {
    width: "47%",
    height: 130,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  catCardAddText: { fontSize: 12, fontWeight: "500" },

  // Dish list
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  backBtn: { padding: 4 },
  catHeaderEmojiBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  catHeaderEmoji: { fontSize: 18 },
  listHeaderTitle: { fontSize: 20, fontFamily: fontFamily.display },
  listHeaderSub: { fontSize: 12 },
  headerEditBtn: { padding: 4 },
  searchRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.sm, fontSize: 14 },
  list: { padding: spacing.lg },

  // DishRow
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  rowImg: { width: 52, height: 52, borderRadius: radius.sm },
  rowImgPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowBody: { flex: 1, gap: 3 },
  rowName: { fontSize: 15, fontWeight: "600" },
  rowIngrs: { fontSize: 12, lineHeight: 16 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: 11, fontWeight: "600" },

  // Empty
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: spacing.sm },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptyText: { fontSize: 13, textAlign: "center", paddingHorizontal: spacing.xl, lineHeight: 20 },

  // FAB
  fab: {
    position: "absolute",
    right: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingBottom: 32,
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: spacing.md, marginBottom: spacing.sm },
  modalTitle: { fontSize: 17, fontWeight: "700", textAlign: "center", marginBottom: spacing.lg },
  modalPreview: { alignItems: "center", marginBottom: spacing.lg, gap: spacing.sm },
  modalPreviewCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  modalPreviewEmoji: { fontSize: 36 },
  modalPreviewName: { fontSize: 15, fontWeight: "600" },
  modalLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs, paddingHorizontal: spacing.lg },
  modalInput: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  emojiRow: { marginBottom: spacing.lg },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  emojiBtnText: { fontSize: 22 },
  paletteRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  paletteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  paletteBtnActive: { borderWidth: 2, borderColor: "#fff" },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  modalDeleteBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: { fontWeight: "600", fontSize: 14 },
  modalSaveBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
