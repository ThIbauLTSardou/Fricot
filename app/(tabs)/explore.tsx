import { useMemo, useState } from "react";
import {
  FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarmitonRecipe, searchMarmitonRecipes, MARMITON_RECIPES } from "@/data/marmitonRecipes";
import { useDishStore } from "@/store/useDishStore";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";
import { detectDishCategory, type DishCategory } from "@/lib/dishCategory";

// Catégories affichées dans l'explorateur (sans "tous" — on a la grille pour ça)
const EXPLORE_CATEGORIES: { key: DishCategory; label: string; emoji: string; color: string }[] = [
  { key: "viande",  label: "Viande",      emoji: "🥩", color: "#e8574a" },
  { key: "poisson", label: "Poisson",     emoji: "🐟", color: "#4a8ee8" },
  { key: "végé",    label: "Végé",        emoji: "🥗", color: "#4ab86a" },
  { key: "pâtes",   label: "Pâtes & riz", emoji: "🍝", color: "#e8a44a" },
  { key: "soupe",   label: "Soupe",       emoji: "🍲", color: "#4ac4e8" },
  { key: "autre",   label: "Autre",       emoji: "🍽️", color: "#878787" },
];

function recipeCategory(r: MarmitonRecipe): DishCategory {
  return detectDishCategory({ id: r.id, name: r.name, imageUri: r.imageUrl, servings: r.servings, ingredients: r.ingredients });
}

// Pré-calcul une fois au chargement du module
const RECIPE_BY_CATEGORY: Record<DishCategory, MarmitonRecipe[]> = (() => {
  const map: Partial<Record<DishCategory, MarmitonRecipe[]>> = {};
  for (const r of MARMITON_RECIPES) {
    const cat = recipeCategory(r);
    if (!map[cat]) map[cat] = [];
    map[cat]!.push(r);
  }
  return map as Record<DishCategory, MarmitonRecipe[]>;
})();

// ─── Vue grille de catégories ────────────────────────────────────────────────

function CategoryGrid({ onSelect }: { onSelect: (cat: DishCategory) => void }) {
  const { colors } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={s.grid}
    >
      {EXPLORE_CATEGORIES.map((cat) => {
        const count = RECIPE_BY_CATEGORY[cat.key]?.length ?? 0;
        const cover = RECIPE_BY_CATEGORY[cat.key]?.find((r) => r.imageUrl)?.imageUrl;
        return (
          <Pressable
            key={cat.key}
            style={({ pressed }) => [
              s.catCard,
              { backgroundColor: pressed ? colors.cardHover : colors.card, borderColor: colors.border },
            ]}
            onPress={() => onSelect(cat.key)}
          >
            <View style={[s.catCardBanner, { backgroundColor: cat.color + "33" }]}>
              {cover ? (
                <Image source={{ uri: cover }} style={s.catCardImg} resizeMode="cover" />
              ) : (
                <Text style={s.catCardEmoji}>{cat.emoji}</Text>
              )}
            </View>
            <View style={s.catCardBody}>
              <Text style={[s.catCardName, { color: colors.text }]} numberOfLines={1}>
                {cat.label}
              </Text>
              <Text style={[s.catCardCount, { color: colors.textMuted }]}>
                {count} recette{count !== 1 ? "s" : ""}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Vue liste de recettes (par catégorie ou recherche) ───────────────────────

type ListViewProps = {
  category: (typeof EXPLORE_CATEGORIES)[0] | null;
  recipes: MarmitonRecipe[];
  query: string;
  onQueryChange: (q: string) => void;
  onBack: () => void;
  added: Record<string, boolean>;
  onAdd: (r: MarmitonRecipe) => void;
};

function RecipeListView({ category, recipes, query, onQueryChange, onBack, added, onAdd }: ListViewProps) {
  const { colors } = useTheme();

  return (
    <View style={[s.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      {category && (
        <View style={[s.listHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
          <Pressable onPress={onBack} hitSlop={8} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
          <View style={[s.catHeaderEmojiBg, { backgroundColor: category.color + "33" }]}>
            <Text style={s.catHeaderEmoji}>{category.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.listHeaderTitle, { color: colors.text }]}>{category.label}</Text>
            <Text style={[s.listHeaderSub, { color: colors.textMuted }]}>
              {recipes.length} recette{recipes.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      )}

      {/* Barre de recherche */}
      <View style={[s.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSubtle} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={onQueryChange}
            placeholder={category ? `Rechercher dans ${category.label}…` : "Poulet, pâtes, curry…"}
            placeholderTextColor={colors.textSubtle}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => onQueryChange("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textSubtle} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={recipes}
        keyExtractor={(r) => r.id}
        contentContainerStyle={s.list}
        ListHeaderComponent={
          <Text style={[s.resultsCount, { color: colors.textSubtle }]}>
            {recipes.length} recette{recipes.length !== 1 ? "s" : ""}
          </Text>
        }
        renderItem={({ item }) => (
          <RecipeCard recipe={item} added={!!added[item.id]} onAdd={() => onAdd(item)} />
        )}
        ListEmptyComponent={
          <View style={s.centered}>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>Aucune recette trouvée.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Carte recette ────────────────────────────────────────────────────────────

function RecipeCard({ recipe, added, onAdd }: { recipe: MarmitonRecipe; added: boolean; onAdd: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Image source={{ uri: recipe.imageUrl }} style={s.cardImg} resizeMode="cover" />
      <View style={s.cardBody}>
        <Text style={[s.cardName, { color: colors.text }]} numberOfLines={2}>
          {recipe.name}
        </Text>
        <View style={s.cardMeta}>
          <Ionicons name="people-outline" size={12} color={colors.textSubtle} />
          <Text style={[s.cardMetaText, { color: colors.textMuted }]}>{recipe.servings} pers.</Text>
          <Text style={[s.cardMetaDot, { color: colors.textSubtle }]}>·</Text>
          <Ionicons name="list-outline" size={12} color={colors.textSubtle} />
          <Text style={[s.cardMetaText, { color: colors.textMuted }]}>{recipe.ingredients.length} ingr.</Text>
        </View>
      </View>
      <Pressable
        onPress={onAdd}
        disabled={added}
        style={[
          s.addBtn,
          { backgroundColor: colors.primary },
          added && { backgroundColor: colors.successGlow, borderWidth: 1, borderColor: colors.success + "44" },
        ]}
      >
        <Ionicons name={added ? "checkmark" : "add"} size={20} color={added ? colors.success : "#fff"} />
      </Pressable>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ExploreScreen() {
  const addDish = useDishStore((s) => s.addDish);
  const { colors } = useTheme();

  const [selectedCat, setSelectedCat] = useState<DishCategory | null>(null);
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const handleAdd = (recipe: MarmitonRecipe) => {
    addDish({ name: recipe.name, servings: recipe.servings, ingredients: recipe.ingredients, imageUri: recipe.imageUrl });
    setAdded((prev) => ({ ...prev, [recipe.id]: true }));
  };

  const handleQueryChange = (q: string) => {
    setQuery(q);
    // Si l'utilisateur tape alors qu'on est dans une catégorie, on reste dedans
  };

  // Quand on tape une recherche depuis la grille, on passe directement en vue liste globale
  const isSearching = query.trim().length > 0 && selectedCat === null;

  const displayedRecipes = useMemo(() => {
    const pool = selectedCat ? (RECIPE_BY_CATEGORY[selectedCat] ?? []) : MARMITON_RECIPES;
    if (!query.trim()) return pool;
    const q = query.trim().toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
    return pool.filter((r) => {
      if (r.name.toLowerCase().replace(/œ/g, "oe").normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q)) return true;
      return r.ingredients.some((i) => i.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").includes(q));
    });
  }, [selectedCat, query]);

  const activeCatMeta = selectedCat ? EXPLORE_CATEGORIES.find((c) => c.key === selectedCat) ?? null : null;

  // Grille de catégories (état par défaut, sans recherche active)
  if (!selectedCat && !isSearching) {
    return (
      <View style={[s.container, { backgroundColor: colors.bg }]}>
        {/* Barre de recherche globale */}
        <View style={[s.searchContainer, { borderBottomColor: colors.border }]}>
          <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSubtle} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={handleQueryChange}
              placeholder="Rechercher parmi 606 recettes…"
              placeholderTextColor={colors.textSubtle}
              returnKeyType="search"
              autoCorrect={false}
            />
          </View>
        </View>
        <CategoryGrid onSelect={(cat) => { setSelectedCat(cat); setQuery(""); }} />
      </View>
    );
  }

  // Vue liste (catégorie sélectionnée OU recherche globale)
  return (
    <RecipeListView
      category={activeCatMeta}
      recipes={displayedRecipes}
      query={query}
      onQueryChange={handleQueryChange}
      onBack={() => { setSelectedCat(null); setQuery(""); }}
      added={added}
      onAdd={handleAdd}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  // Grille
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

  // Header liste
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  backBtn: { padding: 4 },
  catHeaderEmojiBg: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  catHeaderEmoji: { fontSize: 18 },
  listHeaderTitle: { fontSize: 16, fontWeight: "700" },
  listHeaderSub: { fontSize: 12 },

  // Recherche
  searchContainer: { padding: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  searchInput: { flex: 1, paddingVertical: spacing.md, fontSize: 14 },

  // Liste recettes
  list: { padding: spacing.lg, gap: spacing.sm },
  resultsCount: { fontSize: 12, fontWeight: "500", letterSpacing: 0.3, marginBottom: spacing.xs },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: "hidden",
    gap: spacing.md,
  },
  cardImg: { width: 80, height: 80 },
  cardBody: { flex: 1, gap: spacing.xs, paddingVertical: spacing.sm },
  cardName: { fontSize: 14, fontWeight: "600", lineHeight: 19 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12 },
  cardMetaDot: { fontSize: 12, marginHorizontal: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { fontSize: 13, textAlign: "center" },
});
