// Modèles de données de l'application.
// Tout est sérialisable en JSON pour le stockage local (AsyncStorage)
// et facilement transposable vers Supabase plus tard.

export type Ingredient = {
  name: string;
  quantity?: number; // optionnel — ex: 500
  unit?: string; // optionnel — ex: "g", "ml", "pièce"
};

export type Dish = {
  id: string;
  name: string;
  imageUri?: string; // chemin local de l'image (ou URL plus tard)
  servings: number; // nombre de personnes de référence
  ingredients: Ingredient[];
  categoryId?: string; // ID de la catégorie utilisateur (optionnel)
};

export type UserCategory = {
  id: string;
  name: string;
  emoji: string;
  color: string; // hex color
  isDefault: boolean;
};

export type MealSlot = "lunch" | "dinner";

// Jour de la semaine : 0 = lundi ... 6 = dimanche
export const DAYS_FR = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

export const SLOTS: { key: MealSlot; label: string }[] = [
  { key: "lunch", label: "Midi" },
  { key: "dinner", label: "Soir" },
];

// Un créneau peut avoir un plat principal (main) et/ou un plat alternatif (alt).
export type SlotEntry = { main?: string; alt?: string };

// Menu de la semaine : pour chaque jour, un SlotEntry par créneau.
export type WeekPlan = {
  [day: number]: Partial<Record<MealSlot, SlotEntry>>;
};

export type ShoppingItem = {
  id: string;
  label: string; // ex: "Tomates 500 g"
  checked: boolean;
  manual: boolean; // true si ajouté à la main, false si généré depuis le menu
};

export type WeekArchive = {
  id: string;       // uuid
  archivedAt: string; // ISO date
  weekLabel: string;  // ex: "Semaine du 2 juin 2025"
  plan: WeekPlan;
};
