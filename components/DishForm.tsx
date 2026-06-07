import { useMemo, useRef, useState } from "react";
import {
  Image, Keyboard, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import type { Dish, Ingredient } from "@/types/models";
import { Button } from "@/components/Button";
import { useTheme } from "@/lib/ThemeContext";
import { radius, spacing } from "@/lib/theme";
import { UNITS, INGREDIENT_SUGGESTIONS, type IngredientSuggestion } from "@/lib/ingredientSuggestions";
import { useCategoryStore } from "@/store/useCategoryStore";
import { searchMarmitonRecipes, type MarmitonRecipe } from "@/data/marmitonRecipes";

export type DishFormValues = Omit<Dish, "id">;

type Props = {
  initial?: DishFormValues;
  submitLabel: string;
  onSubmit: (values: DishFormValues) => void;
  onDelete?: () => void;
};

type AnchorRect = { x: number; y: number; width: number; height: number };

const emptyIngredient: Ingredient = { name: "", quantity: undefined, unit: "" };

function norm(s: string) {
  return s.toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ─── Dropdown recettes Marmiton ───────────────────────────────────────────────

function RecipeSuggestionDropdown({ query, anchor, onSelect, onClose, selectingRef, colors }: {
  query: string;
  anchor: AnchorRect;
  onSelect: (recipe: MarmitonRecipe) => void;
  onClose: () => void;
  selectingRef: React.MutableRefObject<boolean>;
  colors: any;
}) {
  const matches = useMemo(() => {
    if (query.trim().length < 2) return [];
    return searchMarmitonRecipes(query).slice(0, 5);
  }, [query]);

  if (matches.length === 0) return null;

  const top = anchor.y + anchor.height + 4;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[m.menu, { backgroundColor: colors.card, borderColor: colors.border, top, left: anchor.x, width: anchor.width, maxHeight: 280 }]}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {matches.map((r) => (
            <Pressable
              key={r.id}
              onPressIn={() => { selectingRef.current = true; }}
              onPress={() => { onSelect(r); selectingRef.current = false; }}
              style={[m.recipeItem, { borderBottomColor: colors.border }]}
            >
              <Image source={{ uri: r.imageUrl }} style={m.recipeImg} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={[m.itemName, { color: colors.text }]} numberOfLines={1}>{r.name}</Text>
                <Text style={[m.recipeIngrs, { color: colors.textSubtle }]} numberOfLines={1}>
                  {r.ingredients.slice(0, 3).map((i) => i.name).join(", ")}
                  {r.ingredients.length > 3 ? ` +${r.ingredients.length - 3}` : ""}
                </Text>
              </View>
              <Ionicons name="arrow-down-circle-outline" size={18} color={colors.primary} style={{ marginLeft: 8 }} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Dropdown ingrédients (Modal) ─────────────────────────────────────────────

function IngredientDropdown({ query, pool, anchor, onSelect, onClose, selectingRef, colors }: {
  query: string;
  pool: IngredientSuggestion[];
  anchor: AnchorRect;
  onSelect: (name: string, unit: string) => void;
  onClose: () => void;
  selectingRef: React.MutableRefObject<boolean>;
  colors: any;
}) {
  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = norm(query.trim());
    return pool.filter((s) => norm(s.name).includes(q) && norm(s.name) !== q).slice(0, 6);
  }, [query, pool]);

  if (matches.length === 0) return null;

  const top = anchor.y + anchor.height + 4;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[m.menu, { backgroundColor: colors.card, borderColor: colors.border, top, left: anchor.x, width: anchor.width }]}>
        {matches.map((s) => (
          <Pressable
            key={s.name}
            onPressIn={() => { selectingRef.current = true; }}
            onPress={() => { onSelect(s.name, s.unit); selectingRef.current = false; }}
            style={m.item}
          >
            <Text style={[m.itemName, { color: colors.text }]}>{s.name}</Text>
            <Text style={[m.itemUnit, { color: colors.textSubtle }]}>{s.unit}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

// ─── Dropdown unités (Modal) ──────────────────────────────────────────────────

function UnitDropdown({ selected, anchor, onSelect, onClose, selectingRef, colors }: {
  selected: string;
  anchor: AnchorRect;
  onSelect: (u: string) => void;
  onClose: () => void;
  selectingRef: React.MutableRefObject<boolean>;
  colors: any;
}) {
  const top = anchor.y + anchor.height + 4;

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[m.menu, { backgroundColor: colors.card, borderColor: colors.border, top, left: anchor.x, width: anchor.width, maxHeight: 220 }]}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {UNITS.map((u) => {
            const active = selected === u;
            return (
              <Pressable
                key={u}
                onPressIn={() => { selectingRef.current = true; }}
                onPress={() => { onSelect(u); selectingRef.current = false; }}
                style={[m.item, active && { backgroundColor: colors.primaryGlow }]}
              >
                <Text style={[m.itemName, { color: active ? colors.primary : colors.text, fontWeight: active ? "700" : "400" }]}>
                  {u}
                </Text>
                {active && <Ionicons name="checkmark" size={14} color={colors.primary} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  menu: {
    position: "absolute",
    borderWidth: 1,
    borderRadius: radius.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11 },
  itemName: { fontSize: 14, flex: 1 },
  itemUnit: { fontSize: 12, marginLeft: 8 },
  recipeItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, gap: 10, borderBottomWidth: 1 },
  recipeImg: { width: 44, height: 44, borderRadius: radius.sm },
  recipeIngrs: { fontSize: 11, marginTop: 2 },
});

// ─── Ligne ingrédient ─────────────────────────────────────────────────────────

type DropdownState =
  | { kind: "none" }
  | { kind: "name"; anchor: AnchorRect }
  | { kind: "unit"; anchor: AnchorRect };

function IngredientRow({
  ing,
  index,
  inputStyle,
  colors,
  onUpdate,
  onRemove,
}: {
  ing: Ingredient;
  index: number;
  inputStyle: any[];
  colors: any;
  onUpdate: (patch: Partial<Ingredient>) => void;
  onRemove: () => void;
}) {
  const [dropdown, setDropdown] = useState<DropdownState>({ kind: "none" });
  const nameRef = useRef<View>(null);
  const unitRef = useRef<View>(null);
  const selectingRef = useRef(false); // true pendant le tap sur une suggestion

  function measure(ref: React.RefObject<View | null>, cb: (r: AnchorRect) => void) {
    ref.current?.measureInWindow((x, y, width, height) => cb({ x, y, width, height }));
  }

  const nameDropdownOpen = dropdown.kind === "name";
  const unitDropdownOpen = dropdown.kind === "unit";

  return (
    <View style={s.ingBlock}>
      <View style={s.ingredientRow}>
        {/* Nom */}
        <View ref={nameRef} style={{ flex: 1 }}>
          <TextInput
            style={[...inputStyle, { flex: 1 }]}
            value={ing.name}
            onChangeText={(t) => onUpdate({ name: t })}
            onFocus={() => measure(nameRef, (anchor) => setDropdown({ kind: "name", anchor }))}
            onBlur={() => { if (!selectingRef.current) setDropdown({ kind: "none" }); }}
            placeholder="Ingrédient"
            placeholderTextColor={colors.textSubtle}
          />
        </View>

        {/* Qté */}
        <TextInput
          style={[...inputStyle, { width: 52 }]}
          value={ing.quantity != null ? String(ing.quantity) : ""}
          onChangeText={(t) => {
            const n = parseFloat(t.replace(",", "."));
            onUpdate({ quantity: t.trim() === "" || Number.isNaN(n) ? undefined : n });
          }}
          keyboardType="numeric"
          placeholder="Qté"
          placeholderTextColor={colors.textSubtle}
          onFocus={() => setDropdown({ kind: "none" })}
        />

        {/* Unité */}
        <View ref={unitRef} style={{ width: 80 }}>
          <TextInput
            style={[...inputStyle, { width: 80, fontSize: 13 }, unitDropdownOpen && { borderColor: colors.primary }]}
            value={ing.unit ?? ""}
            onChangeText={(t) => onUpdate({ unit: t })}
            onFocus={() => measure(unitRef, (anchor) => setDropdown({ kind: "unit", anchor }))}
            onBlur={() => { if (!selectingRef.current) setDropdown({ kind: "none" }); }}
            placeholder="unité"
            placeholderTextColor={colors.textSubtle}
          />
        </View>

        {/* Supprimer */}
        <Pressable onPress={onRemove} style={s.removeIngredient}>
          <Ionicons name="close-circle" size={20} color={colors.textSubtle} />
        </Pressable>
      </View>

      {/* Dropdown ingrédient */}
      {nameDropdownOpen && ing.name.length > 0 && (
        <IngredientDropdown
          query={ing.name}
          pool={INGREDIENT_SUGGESTIONS}
          anchor={dropdown.anchor}
          selectingRef={selectingRef}
          onSelect={(name, unit) => {
            onUpdate({ name, unit: ing.unit?.trim() ? ing.unit : unit });
            setDropdown({ kind: "none" });
          }}
          onClose={() => setDropdown({ kind: "none" })}
          colors={colors}
        />
      )}

      {/* Dropdown unité */}
      {unitDropdownOpen && (
        <UnitDropdown
          selected={ing.unit ?? ""}
          anchor={dropdown.anchor}
          selectingRef={selectingRef}
          onSelect={(u) => { onUpdate({ unit: u }); setDropdown({ kind: "none" }); }}
          onClose={() => setDropdown({ kind: "none" })}
          colors={colors}
        />
      )}
    </View>
  );
}

// ─── Formulaire principal ─────────────────────────────────────────────────────

export function DishForm({ initial, submitLabel, onSubmit, onDelete }: Props) {
  const { colors } = useTheme();
  const categories = useCategoryStore((s) => s.categories);
  const [name, setName] = useState(initial?.name ?? "");
  const [imageUri, setImageUri] = useState<string | undefined>(initial?.imageUri);
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [categoryId, setCategoryId] = useState<string | undefined>(initial?.categoryId);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initial?.ingredients?.length ? initial.ingredients : [{ ...emptyIngredient }]
  );
  const [error, setError] = useState<string | null>(null);
  const [recipeAnchor, setRecipeAnchor] = useState<AnchorRect | null>(null);
  const nameInputRef = useRef<View>(null);
  const recipeSelectingRef = useRef(false);

  const servingsRef = useRef(parseInt(servings, 10) || 1);

  const handleServingsChange = (val: string) => {
    const newServings = parseInt(val, 10);
    const oldServings = servingsRef.current;
    setServings(val);
    if (!Number.isNaN(newServings) && newServings > 0 && oldServings > 0 && newServings !== oldServings) {
      servingsRef.current = newServings;
      setIngredients((prev) =>
        prev.map((ing) => ({
          ...ing,
          quantity: ing.quantity != null
            ? Math.round((ing.quantity / oldServings) * newServings * 100) / 100
            : undefined,
        }))
      );
    }
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { setError("Autorisation d'accès aux photos refusée."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const applyRecipe = (recipe: MarmitonRecipe) => {
    setName(recipe.name);
    setImageUri(recipe.imageUrl);
    setServings(String(recipe.servings));
    servingsRef.current = recipe.servings;
    setIngredients(recipe.ingredients.length ? recipe.ingredients.map((i) => ({ ...i })) : [{ ...emptyIngredient }]);
    setRecipeAnchor(null);
  };

  const updateIngredient = (index: number, patch: Partial<Ingredient>) =>
    setIngredients((prev) => prev.map((ing, i) => (i === index ? { ...ing, ...patch } : ing)));

  const addIngredientRow = () => setIngredients((prev) => [...prev, { ...emptyIngredient }]);

  const removeIngredientRow = (index: number) =>
    setIngredients((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) { setError("Le nom du plat est obligatoire."); return; }
    const parsedServings = parseInt(servings, 10);
    const cleanedIngredients = ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({
        name: i.name.trim(),
        quantity: i.quantity != null && !Number.isNaN(i.quantity) ? i.quantity : undefined,
        unit: i.unit?.trim() || undefined,
      }));
    onSubmit({
      name: trimmedName,
      imageUri,
      servings: Number.isNaN(parsedServings) || parsedServings < 1 ? 1 : parsedServings,
      ingredients: cleanedIngredients,
      categoryId,
    });
  };

  const inputStyle = [s.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }];

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      onScrollBeginDrag={() => Keyboard.dismiss()}
    >
      <Pressable
        onPress={pickImage}
        style={[s.imagePicker, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={s.image} />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="camera-outline" size={32} color={colors.textSubtle} />
            <Text style={[s.imagePlaceholderText, { color: colors.textSubtle }]}>Ajouter une photo</Text>
          </View>
        )}
        <View style={s.imageOverlay}>
          <Ionicons name="camera" size={18} color="rgba(255,255,255,0.8)" />
        </View>
      </Pressable>

      {imageUri && (
        <Pressable onPress={() => setImageUri(undefined)} style={s.removePhotoRow}>
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={[s.removePhotoText, { color: colors.danger }]}>Retirer la photo</Text>
        </Pressable>
      )}

      <View style={s.field}>
        <Text style={[s.label, { color: colors.textMuted }]}>Nom du plat</Text>
        <View ref={nameInputRef}>
          <TextInput
            style={inputStyle}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
              nameInputRef.current?.measureInWindow((x, y, width, height) => {
                setRecipeAnchor(t.trim().length >= 2 ? { x, y, width, height } : null);
              });
            }}
            onFocus={() => {
              if (name.trim().length >= 2) {
                nameInputRef.current?.measureInWindow((x, y, width, height) => {
                  setRecipeAnchor({ x, y, width, height });
                });
              }
            }}
            onBlur={() => { if (!recipeSelectingRef.current) setRecipeAnchor(null); }}
            placeholder="Ex: Lasagnes"
            placeholderTextColor={colors.textSubtle}
          />
        </View>
        {recipeAnchor && (
          <RecipeSuggestionDropdown
            query={name}
            anchor={recipeAnchor}
            selectingRef={recipeSelectingRef}
            onSelect={applyRecipe}
            onClose={() => setRecipeAnchor(null)}
            colors={colors}
          />
        )}
      </View>

      <View style={s.field}>
        <Text style={[s.label, { color: colors.textMuted }]}>Catégorie</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.catPickerRow}>
          {categories.map((cat) => {
            const active = categoryId === cat.id;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategoryId(active ? undefined : cat.id)}
                style={[
                  s.catChip,
                  {
                    backgroundColor: active ? cat.color + "22" : colors.card,
                    borderColor: active ? cat.color : colors.border,
                  },
                ]}
              >
                <Text style={s.catChipEmoji}>{cat.emoji}</Text>
                <Text style={[s.catChipLabel, { color: active ? cat.color : colors.textMuted }]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={s.field}>
        <Text style={[s.label, { color: colors.textMuted }]}>Nombre de personnes</Text>
        <TextInput
          style={[...inputStyle, s.inputShort]}
          value={servings}
          onChangeText={handleServingsChange}
          keyboardType="number-pad"
          placeholder="4"
          placeholderTextColor={colors.textSubtle}
        />
      </View>

      <View style={s.field}>
        <Text style={[s.label, { color: colors.textMuted }]}>Ingrédients</Text>
        <View style={s.ingHeader}>
          <Text style={[s.ingColLabel, { flex: 1, color: colors.textSubtle }]}>Nom</Text>
          <Text style={[s.ingColLabel, { width: 52, color: colors.textSubtle }]}>Qté</Text>
          <Text style={[s.ingColLabel, { width: 80, color: colors.textSubtle }]}>Unité</Text>
          <View style={{ width: 32 }} />
        </View>

        {ingredients.map((ing, index) => (
          <View key={index}>
            <IngredientRow
              ing={ing}
              index={index}
              inputStyle={inputStyle}
              colors={colors}
              onUpdate={(patch) => updateIngredient(index, patch)}
              onRemove={() => removeIngredientRow(index)}
            />
            {index < ingredients.length - 1 && (
              <View style={[s.ingDivider, { backgroundColor: colors.border }]} />
            )}
          </View>
        ))}

        <Pressable onPress={addIngredientRow} style={s.addRow}>
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={[s.addRowText, { color: colors.primary }]}>Ajouter un ingrédient</Text>
        </Pressable>
      </View>

      {error && (
        <View style={[s.errorBox, { backgroundColor: colors.dangerGlow, borderColor: colors.danger + "44" }]}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={[s.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      <Button title={submitLabel} onPress={handleSubmit} style={{ marginTop: spacing.lg }} />
      {onDelete && (
        <Button
          title="Supprimer ce plat"
          variant="danger"
          icon="trash-outline"
          onPress={onDelete}
          style={{ marginTop: spacing.sm }}
        />
      )}
      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  imagePicker: { height: 180, borderRadius: radius.lg, overflow: "hidden", borderWidth: 1 },
  image: { width: "100%", height: "100%" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  imagePlaceholderText: { fontSize: 13 },
  imageOverlay: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  removePhotoRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, alignSelf: "flex-end" },
  removePhotoText: { fontSize: 13, fontWeight: "500" },
  field: { marginTop: spacing.lg },
  label: { fontSize: 13, fontWeight: "600", marginBottom: spacing.sm, letterSpacing: 0.3, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, fontSize: 14 },
  inputShort: { width: 100 },
  catPickerRow: { gap: spacing.sm, paddingVertical: 2 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  catChipEmoji: { fontSize: 16 },
  catChipLabel: { fontSize: 13, fontWeight: "500" },
  ingHeader: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: 2 },
  ingColLabel: { fontSize: 11, fontWeight: "500" },
  ingBlock: { marginBottom: spacing.sm },
  ingredientRow: { flexDirection: "row", gap: spacing.sm },
  ingDivider: { height: 1, marginTop: spacing.md, marginBottom: spacing.xs },
  removeIngredient: { width: 32, alignItems: "center", justifyContent: "center" },
  addRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.sm },
  addRowText: { fontWeight: "600", fontSize: 13 },
  errorBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md },
  errorText: { fontSize: 13, flex: 1 },
});
