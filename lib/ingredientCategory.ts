const norm = (s: string) =>
  s.toLowerCase()
    .replace(/œ/g, "oe").replace(/æ/g, "ae")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");

export type IngredientCategory =
  | "fruits-legumes"
  | "viandes-poissons"
  | "produits-laitiers"
  | "feculents"
  | "epicerie"
  | "boissons"
  | "surgeles"
  | "autres";

type CategoryDef = {
  key: IngredientCategory;
  label: string;
  icon: string;
  keywords: string[];
};

export const INGREDIENT_CATEGORIES: CategoryDef[] = [
  {
    key: "fruits-legumes",
    label: "Fruits & Légumes",
    icon: "leaf-outline",
    keywords: [
      "tomate","carotte","courgette","aubergine","poivron","oignon","ail","echalote","poireau",
      "brocoli","chou","epinard","salade","laitue","roquette","celeri","fenouil","radis","navet",
      "betterave","concombre","avocat","champignon","artichaut","asperge","haricot vert","petits pois",
      "mais","courge","potiron","potimarron","panais","topinambour","endive","mache","cresson",
      "pomme","poire","banane","orange","citron","citron vert","pamplemousse","mandarine","kiwi",
      "fraise","framboise","myrtille","mure","cerise","raisin","melon","pasteque","peche","abricot",
      "nectarine","prune","mangue","ananas","papaye","fruit de la passion","grenade","figue",
      "pomme de terre","patate douce",
    ],
  },
  {
    key: "viandes-poissons",
    label: "Viandes & Poissons",
    icon: "flame-outline",
    keywords: [
      "poulet","dinde","canard","lapin","porc","bœuf","boeuf","veau","agneau","mouton",
      "steak","escalope","filet","cuisse","blanc","aile","pilon","cote","roti","gigot",
      "lardons","bacon","jambon","saucisse","merguez","chipolata","chorizo","saucisson",
      "boudin","pate de campagne","foie","rillette",
      "saumon","thon","cabillaud","lieu","sole","daurade","loup","bar","sardine","anchois",
      "hareng","maquereau","truite","crevette","moule","coquille saint-jacques","homard",
      "langouste","calamar","seiche","poulpe","merlu","colin","tilapia",
    ],
  },
  {
    key: "produits-laitiers",
    label: "Produits Laitiers",
    icon: "water-outline",
    keywords: [
      "lait","creme","beurre","fromage","yaourt","yogourt","mascarpone","ricotta","mozzarella",
      "parmesan","gruyere","emmental","comté","comte","camembert","brie","roquefort","chevre",
      "feta","cottage","cheddar","raclette","reblochon","munster","edam","gouda","mimolette",
      "creme fraiche","creme liquide","lait de coco","oeuf","oeufs",
    ],
  },
  {
    key: "feculents",
    label: "Féculents & Céréales",
    icon: "ellipse-outline",
    keywords: [
      "pates","spaghetti","penne","tagliatelle","rigatoni","fusilli","farfalle","lasagne",
      "macaroni","gnocchi","ravioli","nouille","vermicelle",
      "riz","quinoa","boulgour","epeautre","orge","millet","sarrasin","semoule","couscous",
      "pain","baguette","biscottes","farine","maizena","fecule","chapelure",
      "lentille","pois chiche","haricot","flageolet","feve","soja",
      "avoine","muesli","cereale","granola",
    ],
  },
  {
    key: "epicerie",
    label: "Épicerie & Condiments",
    icon: "grid-outline",
    keywords: [
      "huile","vinaigre","sel","poivre","sucre","miel","moutarde","ketchup","mayonnaise",
      "sauce soja","sauce worcestershire","sauce tomate","concentre de tomate","tomates pelees",
      "coulis","bouillon","cube","epice","cumin","paprika","curry","curcuma","cannelle",
      "gingembre","herbe","thym","romarin","basilic","persil","coriandre","menthe","laurier",
      "origan","estragon","ciboulette","piment","tabasco","harissa","sambal",
      "noix de coco","lait de coco","tahini","miso","nuoc mam","tamari",
      "farine","levure","bicarbonate","cacao","chocolat","vanille","extrait",
      "noix","amande","noisette","pistache","cajou","pecan","pignons","graines",
      "olive","cornichon","capre","anchois bocal","sardine boite","thon boite",
    ],
  },
  {
    key: "boissons",
    label: "Boissons",
    icon: "wine-outline",
    keywords: [
      "eau","jus","sirop","vin","biere","cidre","champagne","rhum","whisky","vodka","gin",
      "porto","muscat","cognac","armagnac","liqueur","aperitif","cafe","the","tisane",
      "soda","limonade","coca","pepsi",
    ],
  },
  {
    key: "surgeles",
    label: "Surgelés",
    icon: "snow-outline",
    keywords: [
      "surgele","glace","sorbet","frite surgele","epinard surgele","petits pois surgeles",
      "haricots surgeles","mais surgele",
    ],
  },
];

export function detectIngredientCategory(label: string): IngredientCategory {
  const t = norm(label);
  for (const cat of INGREDIENT_CATEGORIES) {
    if (cat.keywords.some((kw) => t.includes(norm(kw)))) return cat.key;
  }
  return "autres";
}

export const INGREDIENT_CATEGORY_MAP = new Map(
  INGREDIENT_CATEGORIES.map((c) => [c.key, c])
);
// Entrée pour les articles non-classifiés
INGREDIENT_CATEGORY_MAP.set("autres", {
  key: "autres",
  label: "Autres",
  icon: "ellipsis-horizontal-outline",
  keywords: [],
});
