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

const CITIES = [
  "Paris","Lyon","Marseille","Toulouse","Nice","Nantes","Montpellier","Strasbourg",
  "Bordeaux","Lille","Rennes","Reims","Le Havre","Saint-Étienne","Toulon","Grenoble",
  "Dijon","Angers","Nîmes","Villeurbanne","Clermont-Ferrand","Le Mans","Aix-en-Provence",
  "Brest","Tours","Amiens","Limoges","Annecy","Perpignan","Metz","Besançon",
  "Boulogne-Billancourt","Orléans","Mulhouse","Rouen","Caen","Nancy","Saint-Denis",
  "Argenteuil","Montreuil","Roubaix","Tourcoing","Avignon","Poitiers","La Rochelle",
  "Chambéry","Bayonne","Pau","Valence","Colmar","Ajaccio"
];

const FIRSTNAMES = [
  "Clara","Mehdi","Sarah","Pierre","Lina","Julien","Camille","Alex","Inès","Noa","Maya","Jules",
  "Sacha","Leïla","Hugo","Emma","Nina","Yanis","Lucas","Manon","Zoé","Rayan","Louna","Théo"
];

function pick(arr, i) {
  return arr[i % arr.length];
}

/* ✅ BIOS RÉALISTES UNIQUES */
function makeBio({ name, age, sport, city, level }, i) {
  const intros = [
    `Je m'appelle ${name}`,
    `${name}, ${age} ans`,
    `Sportif(ve) sur ${city}`,
    `Installé(e) à ${city}`,
    `Passionné(e) de ${sport.toLowerCase()}`
  ];

  const practices = [
    `je pratique le ${sport.toLowerCase()} surtout pour le plaisir`,
    `je m’entraîne régulièrement`,
    `je reprends doucement le sport`,
    `je fais du ${sport.toLowerCase()} quand le temps le permet`,
    `je cherche à rester actif(ve)`
  ];

  const goals = [
    `objectif : progresser tranquillement`,
    `j’aime surtout la régularité`,
    `pas là pour la compétition`,
    `envie de motivation et de bonne ambiance`,
    `toujours plus sympa à plusieurs`
  ];

  const vibes = [
    `niveau ${level.toLowerCase()}`,
    `plutôt ${level.toLowerCase()}`,
    `rythme cool`,
    `motivé(e) mais sans pression`,
    `open pour s’entraîner ensemble`
  ];

  return `${pick(intros, i)}. ${pick(practices, i + 1)}, ${pick(goals, i + 2)}. ${pick(vibes, i + 3)}.`;
}

function makeSeedProfile(i) {
  const sport = pick(SPORTS, i);
  const level = pick(LEVELS, i + 2);
  const city = pick(CITIES, i + 5);
  const name = pick(FIRSTNAMES, i);
  const age = 18 + (i % 23); // 18–40

  return {
    id: SEED_UUIDS[i],
    user_id: null,
    name,
    age,
    city,
    sport,
    level,
    availability: "En semaine soir + week-end",
    bio: makeBio({ name, age, sport, city, level }, i),
    photo_urls: [],
    isCustom: false,
    isSeed: true,
    createdAt: new Date().toISOString()
  };
}

const SEED_COUNT = 200;

export const seedProfiles = Array.from({ length: SEED_COUNT }, (_, i) =>
  makeSeedProfile(i)
);
