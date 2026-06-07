// Retourne le lundi de la semaine contenant `date` au format YYYY-MM-DD
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=dim
  const diff = day === 0 ? -6 : 1 - day; // décalage vers lundi
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// Retourne le weekStart décalé de `offset` semaines (négatif = passé)
export function offsetWeek(weekStart: string, offset: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + offset * 7);
  return d.toISOString().slice(0, 10);
}

// Label lisible : "Semaine du 2 juin" ou "Semaine du 2 au 8 juin 2025"
export function weekLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const endStr = end.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `${startStr} – ${endStr}`;
}

// Dates des 7 jours de la semaine à partir du lundi weekStart
export function weekDays(weekStart: string): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Retourne le weekStart de la semaine courante
export function currentWeekStart(): string {
  return getWeekStart(new Date());
}
