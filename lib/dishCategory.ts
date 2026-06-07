import type { Dish } from "@/types/models";

export type DishCategory = "tous" | "viande" | "poisson" | "végé" | "pâtes" | "soupe" | "autre";

export const DISH_CATEGORIES: { key: DishCategory; label: string }[] = [
  { key: "tous", label: "Tous" },
  { key: "viande", label: "Viande" },
  { key: "poisson", label: "Poisson" },
  { key: "végé", label: "Végé" },
  { key: "pâtes", label: "Pâtes & riz" },
  { key: "soupe", label: "Soupe" },
  { key: "autre", label: "Autre" },
];

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");

// Mots-clés testés uniquement sur le NOM du plat
const VIANDE_NAME = ["boeuf","poulet","porc","agneau","veau","canard","dinde","lapin","saucisse","merguez","steak","cote","roti","burger","magret","gigot","blanquette","bourguignon","cassoulet","coq au vin","tartiflette","osso","saltimbocca","empanada","fricassee","navarin","pot-au-feu","chili","gratin dauphinois","quiche lorraine","baeckeoffe","choucroute"];
const POISSON_NAME = ["saumon","thon","cabillaud","lieu","sole","daurade","crevette","moule","coquille saint","homard","bouillabaisse","brandade","sardine","anchois","hareng","merlu","plie","dorade","bar ","lotte","gambas","langoustine","fruits de mer","marmite de pecheur","chowder","fish"];
const VEGE_NAME   = ["tofu","falafel","ratatouille","vegeta","veggie","dhal","dal ","buddha bowl","gaspacho","bruschetta","caprese"];
const PATES_NAME  = ["pates","spaghetti","penne","tagliatelle","lasagne","risotto","gnocchi","ravioli","pasta","linguine","fettuccine","rigatoni","bucatini","macaroni","tortellini","cannelloni","carbonara","bolognaise","amatriciana","gratin de riz","riz cantonais","riz saute","riz pilaf","riz au lait","nasi goreng","paella","sushi","maki","couscous","taboulet","tabboule","polenta","pad thai","nouilles","ramen","pho","udon","soba"];
const SOUPE_NAME  = ["soupe","veloute","potage","minestrone","vichyssoise","miso","tom kha","tom yam","bisque","gaspacho","bouillon de"];

// Mots-clés testés sur NOM + INGRÉDIENTS (protéines principales seulement)
const VIANDE_INGR = ["poulet","boeuf","porc","agneau","veau","canard","dinde","lapin","lardons","jambon","merguez","saucisse","steak","magret","gigot"];
const POISSON_INGR = ["saumon","thon","cabillaud","lieu noir","sole","daurade","crevette","moule","langoustine","homard","sardine","anchois","hareng","merlu","gambas","lotte","bar ","dorade"];

export function detectDishCategory(dish: Dish): DishCategory {
  const nameNorm = norm(dish.name);
  const allNorm  = norm([dish.name, ...dish.ingredients.map((i) => i.name)].join(" "));

  const hasViandeName  = VIANDE_NAME.some((k) => nameNorm.includes(norm(k)));
  const hasPoissonName = POISSON_NAME.some((k) => nameNorm.includes(norm(k)));
  const hasPatesName   = PATES_NAME.some((k) => nameNorm.includes(norm(k)));

  // Soupe : nom uniquement (évite de classer "poulet au bouillon de volaille" en soupe)
  if (SOUPE_NAME.some((k) => nameNorm.includes(norm(k)))) return "soupe";

  // Si le nom contient viande ET féculent (ex: couscous poulet, riz au poulet) → viande
  if (hasViandeName && hasPatesName) return "viande";
  // Si le nom contient poisson ET féculent (ex: saumon riz, paella fruits de mer) → poisson
  if (hasPoissonName && hasPatesName) return "poisson";

  // Pâtes/riz/céréales purs (spaghetti carbonara, lasagnes…)
  if (hasPatesName) return "pâtes";

  // Viande et poisson sur le nom
  if (hasViandeName) return "viande";
  if (hasPoissonName) return "poisson";

  // Fallback ingrédients pour viande/poisson
  if (VIANDE_INGR.some((k) => allNorm.includes(norm(k)))) return "viande";
  if (POISSON_INGR.some((k) => allNorm.includes(norm(k)))) return "poisson";

  // Végé : nom + ingrédients
  if (VEGE_NAME.some((k) => allNorm.includes(norm(k)))) return "végé";

  return "autre";
}
