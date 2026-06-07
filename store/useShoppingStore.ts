import { create } from "zustand";
import type { Dish, ShoppingItem, WeekPlan } from "@/types/models";
import {
  getShopping,
  saveShopping,
  insertShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  updateShoppingLabel,
} from "@/data/repository";
import { newId } from "@/lib/id";
import { buildShoppingList } from "@/lib/shoppingList";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

type ShoppingStore = {
  items: ShoppingItem[];
  loaded: boolean;
  load: () => Promise<void>;
  subscribe: () => () => void;
  regenerate: (plan: WeekPlan, dishes: Dish[]) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  addManual: (label: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  updateLabel: (id: string, label: string) => Promise<void>;
};

export const useShoppingStore = create<ShoppingStore>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    const items = await getShopping();
    set({ items, loaded: true });
  },

  subscribe: () => {
    const groupId = useAuthStore.getState().groupId;
    if (!groupId) return () => {};

    const channel = supabase
      .channel(`shopping:${groupId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items", filter: `group_id=eq.${groupId}` },
        (payload) => {
          const { eventType, new: row, old } = payload as any;
          set((s) => {
            if (eventType === "INSERT") {
              // Ignore si on a déjà cet item (optimistic update local)
              if (s.items.some((i) => i.id === row.id)) return s;
              const item: ShoppingItem = { id: row.id, label: row.label, checked: row.checked, manual: row.manual };
              return { items: [...s.items, item] };
            }
            if (eventType === "UPDATE") {
              return {
                items: s.items.map((i) =>
                  i.id === row.id ? { ...i, label: row.label, checked: row.checked } : i
                ),
              };
            }
            if (eventType === "DELETE") {
              return { items: s.items.filter((i) => i.id !== old.id) };
            }
            return s;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  regenerate: async (plan, dishes) => {
    const generated = buildShoppingList(plan, dishes);
    const previous = get().items;

    const checkedLabels = new Set(
      previous.filter((i) => !i.manual && i.checked).map((i) => i.label)
    );
    const generatedWithState = generated.map((g) => ({
      ...g,
      checked: checkedLabels.has(g.label),
    }));
    const manual = previous.filter((i) => i.manual);
    const items = [...generatedWithState, ...manual];
    set({ items });
    await saveShopping(items);
  },

  toggle: async (id) => {
    const prev = get().items;
    const item = prev.find((i) => i.id === id);
    if (!item) return;
    const newChecked = !item.checked;
    set({ items: prev.map((i) => (i.id === id ? { ...i, checked: newChecked } : i)) });
    try {
      await toggleShoppingItem(id, newChecked);
    } catch (e) {
      set({ items: prev });
      throw e;
    }
  },

  addManual: async (label) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const item: ShoppingItem = { id: newId(), label: trimmed, checked: false, manual: true };
    const items = [...get().items, item];
    set({ items });
    try {
      await insertShoppingItem(item, items.length - 1);
    } catch (e) {
      set((s) => ({ items: s.items.filter((i) => i.id !== item.id) }));
      throw e;
    }
  },

  remove: async (id) => {
    const prev = get().items;
    set({ items: prev.filter((i) => i.id !== id) });
    try {
      await deleteShoppingItem(id);
    } catch (e) {
      set({ items: prev });
      throw e;
    }
  },

  updateLabel: async (id, label) => {
    const prev = get().items;
    set({ items: prev.map((i) => (i.id === id ? { ...i, label } : i)) });
    try {
      await updateShoppingLabel(id, label);
    } catch (e) {
      set({ items: prev });
      throw e;
    }
  },
}));
