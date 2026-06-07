import type { Dish, Ingredient, ShoppingItem, WeekPlan } from "@/types/models";

// Clé de fusion : même nom (insensible à la casse) + même unité.
// v1 : pas de conversion d'unités (on ne mélange pas "g" et "kg").
function mergeKey(ing: Ingredient): string {
  const name = ing.name.trim().toLowerCase();
  const unit = (ing.unit ?? "").trim().toLowerCase();
  return `${name}|${unit}`;
}

// Construit un libellé lisible : "Tomates 500 g" / "Sel" (sans quantité).
function formatLabel(name: string, quantity: number | undefined, unit: string): string {
  const parts = [name.trim()];
  if (quantity != null && quantity > 0) parts.push(String(quantity));
  if (unit.trim()) parts.push(unit.trim());
  return parts.join(" ");
}

// Agrège les ingrédients de tous les plats présents dans le menu.
// Les quantités identiques (nom + unité) sont sommées.
export function buildShoppingList(plan: WeekPlan, dishes: Dish[]): ShoppingItem[] {
  const byId = new Map(dishes.map((d) => [d.id, d]));

  type Agg = { name: string; unit: string; quantity: number; hasQuantity: boolean };
  const merged = new Map<string, Agg>();

  for (const dayPlan of Object.values(plan)) {
    for (const entry of Object.values(dayPlan)) {
      if (!entry) continue;
      const dishIds = [entry.main, entry.alt].filter(Boolean) as string[];
      for (const dishId of dishIds) {
        const dish = byId.get(dishId);
        if (!dish) continue;
        for (const ing of dish.ingredients) {
          if (!ing.name.trim()) continue;
          const key = mergeKey(ing);
          const existing = merged.get(key);
          const qty = ing.quantity ?? 0;
          const hasQty = ing.quantity != null && ing.quantity > 0;
          if (existing) {
            existing.quantity += qty;
            existing.hasQuantity = existing.hasQuantity || hasQty;
          } else {
            merged.set(key, {
              name: ing.name.trim(),
              unit: (ing.unit ?? "").trim(),
              quantity: qty,
              hasQuantity: hasQty,
            });
          }
        }
      }
    }
  }

  return Array.from(merged.entries())
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, "fr"))
    .map(([key, agg]) => ({
      id: `gen:${key}`,
      label: formatLabel(
        agg.name,
        agg.hasQuantity ? agg.quantity : undefined,
        agg.unit
      ),
      checked: false,
      manual: false,
    }));
}
