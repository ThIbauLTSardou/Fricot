# 🍽️ Menus de la semaine

Application pour planifier les repas de la semaine sans prise de tête.

- **Mes plats** : créez votre bibliothèque de plats (photo, ingrédients, nombre de personnes).
- **Semaine** : composez le menu midi/soir, ou cliquez sur **🎲 Générer la semaine** pour un tirage aléatoire (toujours modifiable).
- **Courses** : la liste des ingrédients est générée automatiquement à partir du menu, et reste éditable à la main.

Fonctionne sur **mobile** (iOS / Android via Expo Go) **et sur PC** (navigateur).

## Lancer le projet

```bash
npm install

# Web (PC / Mac, dans le navigateur)
npm run web

# Mobile : ouvrez l'app Expo Go et scannez le QR code
npm start
```

## Stockage des données

Pour l'instant, tout est stocké **localement** sur l'appareil (AsyncStorage).
Tous les accès passent par `data/repository.ts` : pour migrer vers **Supabase**
plus tard, il suffira de réécrire l'implémentation de ce fichier, sans toucher
au reste de l'app.

## Architecture

```
app/                  écrans (expo-router)
  (tabs)/             onglets : index (plats), week, shopping
  dish/new, dish/[id] création / édition d'un plat
components/           DishCard, DishForm, WeekGrid, DishPickerModal, Button
store/                stores Zustand (plats, semaine, courses)
data/repository.ts    ⭐ couche d'accès données (local → Supabase plus tard)
lib/                  randomPlan, shoppingList, confirm, id, theme
types/models.ts       modèles de données
```
