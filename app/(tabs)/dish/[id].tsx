import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DishForm, DishFormValues } from "@/components/DishForm";
import { useDishStore } from "@/store/useDishStore";
import { confirm } from "@/lib/confirm";
import { useTheme } from "@/lib/ThemeContext";
import { spacing } from "@/lib/theme";

export default function EditDishScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dish = useDishStore((s) => s.dishes.find((d) => d.id === id));
  const updateDish = useDishStore((s) => s.updateDish);
  const removeDish = useDishStore((s) => s.removeDish);
  const { colors } = useTheme();

  if (!dish) {
    return (
      <View style={[s.missing, { backgroundColor: colors.bg }]}>
        <Text style={[s.missingText, { color: colors.textMuted }]}>Ce plat n'existe plus.</Text>
      </View>
    );
  }

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  const handleSubmit = async (values: DishFormValues) => {
    await updateDish(dish.id, values);
    goBack();
  };

  const handleDelete = async () => {
    const ok = await confirm(
      "Supprimer le plat",
      `Voulez-vous vraiment supprimer « ${dish.name} » ?`
    );
    if (ok) {
      await removeDish(dish.id);
      goBack();
    }
  };

  return (
    <DishForm
      initial={{
        name: dish.name,
        imageUri: dish.imageUri,
        servings: dish.servings,
        ingredients: dish.ingredients,
      }}
      submitLabel="Enregistrer les modifications"
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}

const s = StyleSheet.create({
  missing: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  missingText: { fontSize: 16 },
});
