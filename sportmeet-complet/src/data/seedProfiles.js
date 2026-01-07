// sportmeet-complet/src/data/seedProfiles.js

const SPORTS = [
  "Running",
  "Fitness",
  "Football",
  "Basket",
  "Tennis",
  "Cyclisme",
  "Randonnée",
  "Natation",
  "Musculation"
];

const LEVELS = ["Débutant", "Intermédiaire", "Confirmé"];

// ✅ Villes réparties sur toute la France (grandes + moyennes)
const CITIES = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Montpellier", "Strasbourg",
  "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble",
  "Dijon", "Angers", "Nîmes", "Villeurbanne", "Clermont-Ferrand", "Le Mans", "Aix-en-Provence",
  "Brest", "Tours", "Amiens", "Limoges", "Annecy", "Perpignan", "Metz", "Besançon",
  "Boulogne-Billancourt", "Orléans", "Mulhouse", "Rouen", "Caen", "Nancy", "Saint-Denis",
  "Argenteuil", "Montreuil", "Roubaix", "Tourcoing", "Avignon", "Poitiers", "La Rochelle",
  "Chambéry", "Bayonne", "Pau", "Valence", "Colmar", "Ajaccio"
];

const FIRSTNAMES = [
  "Clara","Mehdi","Sarah","Pierre","Lina","Julien","Camille","Alex","Inès","Noa","Maya","Jules",
  "Sacha","Leïla","Hugo","Emma","Nina","Yanis","Lucas","Manon","Zoé","Rayan","Louna","Théo"
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function makeSeedProfile(i) {
  const sport = pick(SPORTS, i);
  const level = pick(LEVELS, i + 2);
  const city = pick(CITIES, i + 5);
  const name = pick(FIRSTNAMES, i);

  const age = 18 + (i % 23); // 18–40

  return {
    id: `seed-${i + 1}`,
    user_id: null,
    name: `${name}`,
    age,
    city,
    sport,
    level,
    availability: "En semaine soir + week-end",
    bio: "Profil d’attente — la communauté démarre, invite tes amis pour voir plus de monde 💪",
    photo_urls: [],
    isCustom: false,
    isSeed: true,
    createdAt: new Date().toISOString()
  };
}

const SEED_COUNT = 200;

export const seedProfiles = Array.from({ length: SEED_COUNT }).map((_, i) =>
  makeSeedProfile(i)
);
