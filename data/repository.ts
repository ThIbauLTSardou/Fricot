import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";
import type { Dish, Ingredient, ShoppingItem, UserCategory, WeekPlan } from "@/types/models";

function getGroupId(): string | null {
  return useAuthStore.getState().groupId;
}

function getUserId(): string {
  const id = supabase.auth.getUser();
  // Synchrone via le store — on lit depuis la session en cache
  const user = useAuthStore.getState().user;
  if (!user) throw new Error("Utilisateur non connecté");
  return user.id;
}

// --- Mapping helpers ---

function rowToDish(row: {
  id: string; name: string; image_uri: string | null;
  servings: number; ingredients: unknown; category_id?: string | null;
}): Dish {
  return {
    id: row.id,
    name: row.name,
    imageUri: row.image_uri ?? undefined,
    servings: row.servings,
    ingredients: (row.ingredients as Ingredient[]) ?? [],
    categoryId: row.category_id ?? undefined,
  };
}

// --- Catégories utilisateur ---

function rowToCategory(row: {
  id: string; name: string; emoji: string; color: string; is_default: boolean;
}): UserCategory {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    isDefault: row.is_default,
  };
}

export async function getCategories(): Promise<UserCategory[]> {
  const groupId = getGroupId();
  if (!groupId) return [];
  const { data, error } = await supabase
    .from("user_categories")
    .select("id, name, emoji, color, is_default, position")
    .eq("group_id", groupId)
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToCategory);
}

export async function insertCategory(cat: UserCategory): Promise<void> {
  const groupId = getGroupId();
  if (!groupId) return;
  const { error } = await supabase.from("user_categories").insert({
    id: cat.id,
    group_id: groupId,
    name: cat.name,
    emoji: cat.emoji,
    color: cat.color,
    is_default: false,
    position: 99,
  });
  if (error) throw error;
}

export async function updateCategoryById(
  id: string,
  patch: Partial<Omit<UserCategory, "id" | "isDefault">>
): Promise<void> {
  const { error } = await supabase
    .from("user_categories")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.emoji !== undefined && { emoji: patch.emoji }),
      ...(patch.color !== undefined && { color: patch.color }),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCategoryById(id: string): Promise<void> {
  const { error } = await supabase.from("user_categories").delete().eq("id", id);
  if (error) throw error;
}

// --- Plats ---

export async function getDishes(): Promise<Dish[]> {
  const groupId = getGroupId();
  let query = supabase
    .from("dishes")
    .select("id, name, image_uri, servings, ingredients, category_id, created_by");
  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.is("group_id", null).eq("created_by", getUserId());
  }
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToDish);
}

export async function insertDish(dish: Dish): Promise<void> {
  const groupId = getGroupId();
  const userId = getUserId();
  const { error } = await supabase.from("dishes").insert({
    id: dish.id,
    group_id: groupId,
    created_by: userId,
    name: dish.name,
    image_uri: dish.imageUri ?? null,
    servings: dish.servings,
    ingredients: dish.ingredients as never,
    category_id: dish.categoryId ?? null,
  });
  if (error) throw error;
}

export async function updateDishById(id: string, patch: Partial<Dish>): Promise<void> {
  const { error } = await supabase
    .from("dishes")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.imageUri !== undefined && { image_uri: patch.imageUri ?? null }),
      ...(patch.servings !== undefined && { servings: patch.servings }),
      ...(patch.ingredients !== undefined && { ingredients: patch.ingredients as never }),
      ...(patch.categoryId !== undefined && { category_id: patch.categoryId ?? null }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDishById(id: string): Promise<void> {
  const { error } = await supabase.from("dishes").delete().eq("id", id);
  if (error) throw error;
}

export async function saveDishes(dishes: Dish[]): Promise<void> {
  const groupId = getGroupId();
  const userId = getUserId();
  if (groupId) {
    await supabase.from("dishes").delete().eq("group_id", groupId);
  } else {
    await supabase.from("dishes").delete().is("group_id", null).eq("created_by", userId);
  }
  if (dishes.length > 0) {
    const { error } = await supabase.from("dishes").insert(
      dishes.map((d) => ({
        id: d.id,
        group_id: groupId,
        created_by: userId,
        name: d.name,
        image_uri: d.imageUri ?? null,
        servings: d.servings,
        ingredients: d.ingredients as never,
      }))
    );
    if (error) throw error;
  }
}

// --- Plans de semaine (multi-semaines) ---

function normalizePlan(raw: Record<string, unknown>): WeekPlan {
  return Object.fromEntries(
    Object.entries(raw).map(([dayKey, dayVal]) => {
      const dayPlan = dayVal as Record<string, unknown>;
      const migratedDay = Object.fromEntries(
        Object.entries(dayPlan).map(([slotKey, slotVal]) => {
          if (typeof slotVal === "string") return [slotKey, { main: slotVal }];
          return [slotKey, slotVal];
        })
      );
      return [Number(dayKey), migratedDay];
    })
  ) as WeekPlan;
}

// Charge les plans pour une plage de weekStart (format YYYY-MM-DD)
export async function getWeekPlans(weekStarts: string[]): Promise<Record<string, WeekPlan>> {
  const groupId = getGroupId();
  let query = supabase.from("week_plans").select("week_start, plan").in("week_start", weekStarts);
  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.is("group_id", null);
  }
  const { data, error } = await query;
  if (error) throw error;
  const result: Record<string, WeekPlan> = {};
  for (const row of data ?? []) {
    result[row.week_start] = normalizePlan(row.plan as Record<string, unknown>);
  }
  return result;
}

export async function saveWeekPlan(weekStart: string, plan: WeekPlan): Promise<void> {
  const groupId = getGroupId();
  const { error } = await supabase
    .from("week_plans")
    .upsert({ group_id: groupId, week_start: weekStart, plan: plan as never }, { onConflict: "group_id,week_start" });
  if (error) throw error;
}

export async function deleteWeekPlan(weekStart: string): Promise<void> {
  const groupId = getGroupId();
  let query = supabase.from("week_plans").delete().eq("week_start", weekStart);
  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.is("group_id", null);
  }
  const { error } = await query;
  if (error) throw error;
}

// --- Liste de courses ---

export async function getShopping(): Promise<ShoppingItem[]> {
  const groupId = getGroupId();
  let query = supabase.from("shopping_items").select("id, label, checked, manual");
  if (groupId) {
    query = query.eq("group_id", groupId);
  } else {
    query = query.is("group_id", null);
  }
  const { data, error } = await query.order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    checked: row.checked,
    manual: row.manual,
  }));
}

export async function insertShoppingItem(item: ShoppingItem, position: number): Promise<void> {
  const groupId = getGroupId();
  const { error } = await supabase.from("shopping_items").insert({
    id: item.id,
    group_id: groupId,
    label: item.label,
    checked: item.checked,
    manual: item.manual,
    position,
  });
  if (error) throw error;
}

export async function toggleShoppingItem(id: string, checked: boolean): Promise<void> {
  const { error } = await supabase
    .from("shopping_items")
    .update({ checked })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw error;
}

export async function updateShoppingLabel(id: string, label: string): Promise<void> {
  const { error } = await supabase
    .from("shopping_items")
    .update({ label })
    .eq("id", id);
  if (error) throw error;
}

// Kept for compatibility — full replace
export async function saveShopping(items: ShoppingItem[]): Promise<void> {
  const groupId = getGroupId();
  if (groupId) {
    await supabase.from("shopping_items").delete().eq("group_id", groupId);
  } else {
    await supabase.from("shopping_items").delete().is("group_id", null);
  }
  if (items.length > 0) {
    const { error } = await supabase.from("shopping_items").insert(
      items.map((item, i) => ({
        id: item.id,
        group_id: groupId,
        label: item.label,
        checked: item.checked,
        manual: item.manual,
        position: i,
      }))
    );
    if (error) throw error;
  }
}
