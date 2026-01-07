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
  "Paris 11",
  "Paris 15",
  "Paris 18",
  "Lyon",
  "Marseille",
  "Toulouse",
  "Bordeaux",
  "Lille",
  "Nantes",
  "Nice",
  "Rennes",
  "Strasbourg",
  "Montpellier"
];

const NAMES = [
  "Clara",
  "Mehdi",
  "Sarah",
  "Pierre",
  "Lina",
  "Julien",
  "Camille",
  "Alex",
  "Inès",
  "Noa",
  "Maya",
  "Jules",
  "Sacha",
  "Leïla",
  "Hugo",
  "Emma",
  "Nina",
  "Yanis",
  "Lucas",
  "Manon"
];

const AVAILABILITIES = [
  "Lundi & mercredi soir",
  "Mardi & jeudi soir",
  "Week-end matin",
  "Samedi après-midi",
  "Dimanche matin",
  "En semaine après le travail",
  "Variable, plutôt fin de journée"
];

const BIO_TEMPLATES = [
  (sport) => `Profil démo — Je cherche un/une partenaire pour ${sport.toLowerCase()} et rester motivé(e) 💪`,
  (sport) => `Profil démo — Partant(e) pour des séances ${sport.toLowerCase()} régulières, ambiance cool 🙂`,
  (sport) => `Profil démo — Objectif: progresser en ${sport.toLowerCase()} et rencontrer du monde.`,
  (sport) => `Profil démo — Je débute / reprends le ${sport.toLowerCase()}, j’aimerais être accompagné(e).`,
  (sport) => `Profil démo — Séances ${sport.toLowerCase()} + bonne énergie. Invite tes potes pour agrandir la commu !`
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function makeDemoProfile(i) {
  const sport = pick(SPORTS, i);
  const level = pick(LEVELS, i + 2);
  const city = pick(CITIES, i + 5);
  const name = pick(NAMES, i);

  const age = 18 + (i % 23); // 18 -> 40
  const availability = pick(AVAILABILITIES, i + 3);
  const bio = pick(BIO_TEMPLATES, i)(sport);

  return {
    id: `demo-${i + 1}`,
    user_id: null,
    name: `${name}`,
    age,
    city,
    sport,
    level,
    availability,
    bio,
    photo_urls: [],
    isCustom: false,
    isDemo: true,
    createdAt: new Date().toISOString()
  };
}

/**
 * ✅ Profils "démo" transparents (pas des vraies personnes)
 * Tu peux ajuster DEMO_COUNT (ex: 80, 120, 200)
 */
const DEMO_COUNT = 120;

// Tes 6 profils d’origine (gardés), simplement marqués isDemo: true
const baseSeed = [
  {
    id: "demo-1",
    user_id: null,
    name: "Clara",
    age: 27,
    city: "Paris 11",
    sport: "Running",
    level: "Intermédiaire",
    availability: "Mardi & jeudi soir, dimanche matin",
    bio: "Profil démo — Je prépare mon premier semi-marathon et je cherche un ou une partenaire pour rester motivée. Rythme autour de 5'45/km.",
    photo_urls: [],
    isCustom: false,
    isDemo: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "demo-2",
    user_id: null,
    name: "Mehdi",
    age: 31,
    city: "Lyon",
    sport: "Musculation",
    level: "Confirmé",
    availability: "Lundi, mercredi, vendredi après le travail",
    bio: "Profil démo — Je m'entraîne en salle depuis 5 ans. Objectif : prise de masse propre + séance cardio le week-end.",
    photo_urls: [],
    isCustom: false,
    isDemo: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "demo-3",
    user_id: null,
    name: "Sarah",
    age: 24,
    city: "Marseille",
    sport: "Tennis",
    level: "Intermédiaire",
    availability: "Week-end et certains soirs",
    bio: "Profil démo — Je reprends le tennis après quelques années de pause. Plutôt simple, mais partante pour des doubles aussi.",
    photo_urls: [],
    isCustom: false,
    isDemo: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "demo-4",
    user_id: null,
    name: "Pierre",
    age: 35,
    city: "Toulouse",
    sport: "Cyclisme",
    level: "Confirmé",
    availability: "Samedi et dimanche matin",
    bio: "Profil démo — Sorties route de 60 à 90 km autour de Toulouse. Je roule à 26–28 km/h en moyenne.",
    photo_urls: [],
    isCustom: false,
    isDemo: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "demo-5",
    user_id: null,
    name: "Lina",
    age: 22,
    city: "Lille",
    sport: "Fitness",
    level: "Débutant",
    availability: "Variable, souvent fin de journée",
    bio: "Profil démo — Je découvre le fitness et les cours collectifs. Je cherche quelqu'un pour m'accompagner et rester régulière.",
    photo_urls: [],
    isCustom: false,
    isDemo: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "demo-6",
    user_id: null,
    name: "Julien",
    age: 29,
    city: "Bordeaux",
    sport: "Football",
    level: "Confirmé",
    availability: "Matchs le week-end, entraînements en semaine",
    bio: "Profil démo — Je joue milieu offensif. Je cherche des gens motivés pour des five ou des matchs amicaux.",
    photo_urls: [],
    isCustom: false,
    isDemo: true,
    createdAt: new Date().toISOString()
  }
];

// On complète jusqu’à DEMO_COUNT
const extra = [];
for (let i = baseSeed.length; i < DEMO_COUNT; i++) {
  extra.push(makeDemoProfile(i));
}

export const seedProfiles = [...baseSeed, ...extra];
