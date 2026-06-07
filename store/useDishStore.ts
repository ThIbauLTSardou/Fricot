import { create } from "zustand";
import type { Dish } from "@/types/models";
import { getDishes, insertDish, updateDishById, deleteDishById } from "@/data/repository";
import { newId } from "@/lib/id";

type DishStore = {
  dishes: Dish[];
  loaded: boolean;
  load: () => Promise<void>;
  addDish: (dish: Omit<Dish, "id">) => Promise<Dish>;
  updateDish: (id: string, patch: Partial<Omit<Dish, "id">>) => Promise<void>;
  removeDish: (id: string) => Promise<void>;
  getById: (id: string) => Dish | undefined;
};

export const useDishStore = create<DishStore>((set, get) => ({
  dishes: [],
  loaded: false,

  load: async () => {
    const dishes = await getDishes();
    set({ dishes, loaded: true });
  },

  addDish: async (dish) => {
    const created: Dish = { ...dish, id: newId() };
    // Optimistic update
    set((s) => ({ dishes: [...s.dishes, created] }));
    try {
      await insertDish(created);
    } catch (e) {
      // Rollback
      set((s) => ({ dishes: s.dishes.filter((d) => d.id !== created.id) }));
      throw e;
    }
    return created;
  },

  updateDish: async (id, patch) => {
    const prev = get().dishes;
    set({ dishes: prev.map((d) => (d.id === id ? { ...d, ...patch } : d)) });
    try {
      await updateDishById(id, patch);
    } catch (e) {
      set({ dishes: prev });
      throw e;
    }
  },

  removeDish: async (id) => {
    const prev = get().dishes;
    set({ dishes: prev.filter((d) => d.id !== id) });
    try {
      await deleteDishById(id);
    } catch (e) {
      set({ dishes: prev });
      throw e;
    }
  },

  getById: (id) => get().dishes.find((d) => d.id === id),
}));
