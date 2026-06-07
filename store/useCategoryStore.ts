import { create } from "zustand";
import type { UserCategory } from "@/types/models";
import {
  getCategories,
  insertCategory,
  updateCategoryById,
  deleteCategoryById,
} from "@/data/repository";
import { newId } from "@/lib/id";

export const DEFAULT_CATEGORIES: UserCategory[] = [
  { id: "default:viande",   name: "Viande",     emoji: "🥩", color: "#e8574a", isDefault: true },
  { id: "default:poisson",  name: "Poisson",    emoji: "🐟", color: "#4a8ee8", isDefault: true },
  { id: "default:vege",     name: "Végé",       emoji: "🥗", color: "#4ab86a", isDefault: true },
  { id: "default:pates",    name: "Pâtes & riz", emoji: "🍝", color: "#e8a44a", isDefault: true },
  { id: "default:soupe",    name: "Soupe",      emoji: "🍲", color: "#4ac4e8", isDefault: true },
  { id: "default:dessert",  name: "Dessert",    emoji: "🍰", color: "#c44ae8", isDefault: true },
  { id: "default:autre",    name: "Autre",      emoji: "🍽️", color: "#878787", isDefault: true },
];

type CategoryStore = {
  categories: UserCategory[];
  loaded: boolean;
  load: () => Promise<void>;
  addCategory: (cat: Omit<UserCategory, "id" | "isDefault">) => Promise<UserCategory>;
  updateCategory: (id: string, patch: Partial<Omit<UserCategory, "id" | "isDefault">>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  getById: (id: string) => UserCategory | undefined;
};

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: DEFAULT_CATEGORIES,
  loaded: false,

  load: async () => {
    const custom = await getCategories();
    set({ categories: [...DEFAULT_CATEGORIES, ...custom], loaded: true });
  },

  addCategory: async (cat) => {
    const created: UserCategory = { ...cat, id: newId(), isDefault: false };
    set((s) => ({ categories: [...s.categories, created] }));
    try {
      await insertCategory(created);
    } catch (e) {
      set((s) => ({ categories: s.categories.filter((c) => c.id !== created.id) }));
      throw e;
    }
    return created;
  },

  updateCategory: async (id, patch) => {
    const prev = get().categories;
    set({ categories: prev.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
    // Les catégories par défaut (id "default:xxx") n'existent pas en Supabase — pas d'appel réseau
    if (id.startsWith("default:")) return;
    try {
      await updateCategoryById(id, patch);
    } catch (e) {
      set({ categories: prev });
      throw e;
    }
  },

  removeCategory: async (id) => {
    const prev = get().categories;
    set({ categories: prev.filter((c) => c.id !== id) });
    try {
      await deleteCategoryById(id);
    } catch (e) {
      set({ categories: prev });
      throw e;
    }
  },

  getById: (id) => get().categories.find((c) => c.id === id),
}));
