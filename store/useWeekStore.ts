import { create } from "zustand";
import type { Dish, MealSlot, SlotEntry, WeekPlan } from "@/types/models";
import { getWeekPlans, saveWeekPlan, deleteWeekPlan } from "@/data/repository";
import { buildRandomPlan } from "@/lib/randomPlan";
import { currentWeekStart, offsetWeek } from "@/lib/weekDates";

const PAST_WEEKS = 4;
const FUTURE_WEEKS = 4;

function allWeekStarts(): string[] {
  const cur = currentWeekStart();
  const starts: string[] = [];
  for (let i = -PAST_WEEKS; i <= FUTURE_WEEKS; i++) {
    starts.push(offsetWeek(cur, i));
  }
  return starts;
}

type WeekStore = {
  // plans indexés par weekStart (YYYY-MM-DD)
  plans: Record<string, WeekPlan>;
  loaded: boolean;

  load: () => Promise<void>;

  // Lecture du plan d'une semaine (vide si non existant)
  getPlan: (weekStart: string) => WeekPlan;

  setSlot: (weekStart: string, day: number, slot: MealSlot, kind: "main" | "alt", dishId: string | undefined) => void;
  setSlotBulk: (weekStart: string, plan: WeekPlan) => void;
  randomize: (weekStart: string, dishes: Dish[]) => void;
  clearWeek: (weekStart: string) => void;
};

export const useWeekStore = create<WeekStore>((set, get) => ({
  plans: {},
  loaded: false,

  load: async () => {
    const weeks = allWeekStarts();
    const plans = await getWeekPlans(weeks);
    set({ plans, loaded: true });
  },

  getPlan: (weekStart) => get().plans[weekStart] ?? {},

  setSlot: (weekStart, day, slot, kind, dishId) => {
    const plans = get().plans;
    const plan = { ...(plans[weekStart] ?? {}) };
    const dayPlan = { ...(plan[day] ?? {}) };
    const entry: SlotEntry = { ...(dayPlan[slot] ?? {}) };
    if (dishId) {
      entry[kind] = dishId;
    } else {
      delete entry[kind];
    }
    if (!entry.main && !entry.alt) {
      delete dayPlan[slot];
    } else {
      dayPlan[slot] = entry;
    }
    plan[day] = dayPlan;
    const newPlans = { ...plans, [weekStart]: plan };
    set({ plans: newPlans });
    saveWeekPlan(weekStart, plan);
  },

  setSlotBulk: (weekStart, plan) => {
    const newPlans = { ...get().plans, [weekStart]: plan };
    set({ plans: newPlans });
    saveWeekPlan(weekStart, plan);
  },

  randomize: (weekStart, dishes) => {
    const plan = buildRandomPlan(dishes);
    const newPlans = { ...get().plans, [weekStart]: plan };
    set({ plans: newPlans });
    saveWeekPlan(weekStart, plan);
  },

  clearWeek: (weekStart) => {
    const newPlans = { ...get().plans, [weekStart]: {} };
    set({ plans: newPlans });
    deleteWeekPlan(weekStart);
  },
}));
