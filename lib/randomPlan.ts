import type { Dish, WeekPlan } from "@/types/models";
import { DAYS_FR, SLOTS } from "@/types/models";

// Mélange un tableau (Fisher-Yates), sans muter l'original.
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Remplit les 14 créneaux (7 jours × midi/soir) avec des plats tirés au hasard.
// On évite les répétitions tant qu'il reste des plats non utilisés :
// on pioche dans un sac mélangé que l'on recharge une fois vidé.
export function buildRandomPlan(dishes: Dish[]): WeekPlan {
  const plan: WeekPlan = {};
  if (dishes.length === 0) return plan;

  let bag: Dish[] = [];
  const draw = (): Dish => {
    if (bag.length === 0) bag = shuffle(dishes);
    return bag.pop()!;
  };

  for (let day = 0; day < DAYS_FR.length; day++) {
    const dayPlan: WeekPlan[number] = {};
    for (const slot of SLOTS) {
      dayPlan[slot.key] = { main: draw().id };
    }
    plan[day] = dayPlan;
  }
  return plan;
}
