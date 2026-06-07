// Client de l'API Edamam (Recipe Search API v2).
//
// Edamam renvoie des recettes avec image et ingrédients structurés
// (quantité + unité), ce qui se mappe directement sur notre modèle `Dish`.
//
// Les clés viennent de variables d'environnement EXPO_PUBLIC_* (cf. .env).
// On demande les résultats en français via l'en-tête Accept-Language.

import type { Ingredient } from "@/types/models";
import { newId } from "@/lib/id";

const APP_ID = process.env.EXPO_PUBLIC_EDAMAM_APP_ID ?? "";
const APP_KEY = process.env.EXPO_PUBLIC_EDAMAM_APP_KEY ?? "";
const BASE_URL = "https://api.edamam.com/api/recipes/v2";


export function hasEdamamKeys(): boolean {
  return APP_ID.length > 0 && APP_KEY.length > 0;
}

// Résultat de recherche : une recette prête à être copiée dans "Mes plats".
export type RecipeResult = {
  id: string;
  name: string;
  imageUri?: string;
  servings: number;
  ingredients: Ingredient[];
  source?: string; // nom du site source (ex: "Marmiton")
  url?: string; // lien vers la recette d'origine
};

// --- Types bruts (partiels) de la réponse Edamam ---
type EdamamIngredient = {
  food?: string;
  quantity?: number;
  measure?: string | null;
  text?: string;
};

type EdamamRecipe = {
  label: string;
  image?: string;
  images?: { REGULAR?: { url: string }; SMALL?: { url: string } };
  yield?: number;
  source?: string;
  url?: string;
  ingredients?: EdamamIngredient[];
};

type EdamamResponse = {
  hits?: { recipe: EdamamRecipe }[];
};

// "Unit" / "<unit>" d'Edamam → unité affichable, ou undefined si non pertinent.
function normalizeMeasure(measure: string | null | undefined): string | undefined {
  if (!measure) return undefined;
  const m = measure.trim().toLowerCase();
  if (m === "" || m === "<unit>" || m === "unit") return undefined;
  return measure.trim();
}

function mapIngredient(ing: EdamamIngredient): Ingredient {
  const name = (ing.food ?? ing.text ?? "").trim();
  const quantity =
    typeof ing.quantity === "number" && ing.quantity > 0
      ? Math.round(ing.quantity * 100) / 100
      : undefined;
  return {
    name,
    quantity,
    unit: normalizeMeasure(ing.measure),
  };
}

function mapRecipe(recipe: EdamamRecipe): RecipeResult {
  const image =
    recipe.images?.REGULAR?.url ?? recipe.images?.SMALL?.url ?? recipe.image;
  const servings =
    typeof recipe.yield === "number" && recipe.yield >= 1
      ? Math.round(recipe.yield)
      : 4;
  return {
    id: newId(),
    name: recipe.label,
    imageUri: image,
    servings,
    ingredients: (recipe.ingredients ?? [])
      .map(mapIngredient)
      .filter((i) => i.name.length > 0),
    source: recipe.source,
    url: recipe.url,
  };
}

export class EdamamError extends Error {}

// Recherche de recettes par mot-clé. Renvoie une liste prête pour l'UI.
export async function searchRecipes(query: string): Promise<RecipeResult[]> {
  if (!hasEdamamKeys()) {
    throw new EdamamError("missing-keys");
  }
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    type: "public",
    q,
    app_id: APP_ID,
    app_key: APP_KEY,
    // Champs nécessaires (limite la charge et évite les champs payants).
    field: "label",
  });
  // URLSearchParams n'autorise qu'une valeur par clé via l'objet : on ajoute
  // les autres champs manuellement.
  for (const f of ["image", "images", "url", "source", "yield", "ingredients"]) {
    params.append("field", f);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}?${params.toString()}`, {
      headers: {
        "Accept-Language": "fr",
      },
    });
  } catch {
    throw new EdamamError("network");
  }

  if (res.status === 401 || res.status === 403) {
    throw new EdamamError("auth");
  }
  if (res.status === 429) {
    throw new EdamamError("quota");
  }
  if (!res.ok) {
    throw new EdamamError("http");
  }

  const data = (await res.json()) as EdamamResponse & { status?: string };
  if (data.status === "error") {
    throw new EdamamError("quota");
  }
  return (data.hits ?? []).map((h) => mapRecipe(h.recipe));
}
