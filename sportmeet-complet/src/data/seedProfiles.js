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


function pick\(arr, i\) {
  return arr\[i % arr\.length\];
}

function makeBio({ name, age, sport, city, level }, i) {
  // bios naturelles et variées, sans doublons visibles
  const intros = [
    `${name}, ${age} ans à ${city}.`,
    `Hello, moi c’est ${name} (${age}) — ${city}.`,
    `${name} ici, basé(e) à ${city}.`,
    `Installé(e) à ${city}, ${age} ans.`,
    `${name}, ${age} ans.`
  ];

  const sportLines = {
    Running: [
      "Je cours surtout pour me vider la tête après le boulot.",
      "Je prépare un petit objectif (10 km / semi) sans me prendre la tête.",
      "Sorties régulières, rythme tranquille mais constant."
    ],
    Fitness: [
      "J’aime les séances simples et efficaces (renfo + cardio).",
      "Je m’entraîne pour l’énergie et la constance, pas pour la perf.",
      "Plutôt training propre que séance extrême."
    ],
    Football: [
      "Foot loisir avant tout : plaisir + bonne ambiance.",
      "Je joue pour l’équipe et le fun, niveau détente mais sérieux.",
      "Partant(e) pour une session ou un five quand ça s’aligne."
    ],
    Basket: [
      "Basket pour le fun : shoot, rythme, et bonne humeur.",
      "J’aime les matchs sans prise de tête mais engagés.",
      "Je suis chaud(e) pour un playground ou un 3x3."
    ],
    Tennis: [
      "Tennis pour progresser tranquille, échanges et régularité.",
      "Je cherche des partenaires pour jouer régulièrement.",
      "Je préfère les matchs amicaux et les bonnes sensations."
    ],
    Cyclisme: [
      "Vélo route / sorties plaisir, parfois un peu plus long le week-end.",
      "J’aime rouler pour me défouler et découvrir des coins.",
      "Sorties régulières, rythme adaptable."
    ],
    Randonnée: [
      "Randos plutôt week-end, rythme cool mais motivé(e).",
      "J’adore marcher et découvrir de nouveaux spots.",
      "Toujours partant(e) pour un itinéraire sympa et une pause vue."
    ],
    Natation: [
      "Natation pour le cardio et se sentir bien.",
      "Je nage pour la régularité, pas la compétition.",
      "Plutôt séances propres, technique tranquille."
    ],
    Musculation: [
      "Renfo / muscu pour progresser proprement.",
      "Je vise la constance, technique et motivation.",
      "Séances régulières, sans ego-lift."
    ]
  };

  const goals = [
    "À plusieurs, c’est plus simple de rester motivé(e).",
    "Si tu es motivé(e), on se cale une séance !",
    "Objectif : régularité et bonne vibe.",
    "Je cherche surtout un/une partenaire fiable.",
    "Partant(e) pour s’entraîner et se pousser un peu."
  ];

  const levelLine = [
    `Niveau ${level.toLowerCase()}.`,
    `Plutôt ${level.toLowerCase()}.`,
    `${level} — et j’aime progresser.`
  ];

  const a = intros[i % intros.length];
  const sportArr = sportLines[sport] || ["Je bouge dès que je peux et j’aime la motivation à deux."];
  const b = sportArr[(i + 1) % sportArr.length];
  const c = goals[(i + 2) % goals.length];
  const d = levelLine[(i + 3) % levelLine.length];

  return `${a} ${b} ${c} ${d}`;
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



const SEED_UUIDS = [
  "6833d9ad-6628-4139-a65e-afff7dcd78b8",
  "6f979cd5-6868-4c54-92b7-e5f9bd663a5c",
  "e5736894-e90a-405e-8f8c-fa2fbd9f69cf",
  "5f0af08e-eee7-461e-ad67-5596d224a7d4",
  "0c3edf2d-108b-4ebb-b0a5-dd805ce95e98",
  "9541537a-4cb6-4264-8395-b7e64a5ebcc0",
  "d93faf3d-cc38-4071-b4e8-142196f2c5a6",
  "9ddf64bf-d9dc-41fb-9401-ae6ac32d6923",
  "0380f6cb-c902-480e-b856-2d3ba17dfd49",
  "e114543e-5168-469c-99cd-615fa7c0bf07",
  "0e563aef-bd13-4b27-b5e2-43383a70347b",
  "0b1d3063-671d-44a8-afc0-505c8dd42271",
  "a7197b25-351c-46c3-aef0-8cc97b2f88ed",
  "57762bf4-912b-49bb-8440-f190e4ca17ff",
  "e2bc4c4f-fbff-4915-a07a-79ed229b99e0",
  "1cf1c2c5-4847-4424-99e5-c7f5c4aea321",
  "2427d74f-db43-43c4-943b-4d7b232cd892",
  "81a175aa-5f59-4773-96e7-76c62dc3250e",
  "811a92fb-649e-473a-8d09-6c6fd761c165",
  "f273f6f1-7652-44e5-86a0-629678ab916d",
  "49578ee0-ce49-4564-9be4-65351fb18a37",
  "23939c13-3f5d-4a02-bd2d-7107d28a1392",
  "b1ee0bf3-48b6-445e-8df3-ba0dd2bf1d44",
  "f71a0d62-061f-4d2a-a0a7-a1ea20c5d9a9",
  "9e16adba-58dd-476c-9226-816864206926",
  "68b490cb-e44f-42cc-bd4d-d94b05d65298",
  "12dc47a9-fa35-42d7-9ae4-9089ac418a66",
  "14f5fb92-017b-496f-9f33-6b735c42c8a4",
  "386e99c2-91c9-4671-adbf-9851fad8a2dd",
  "dec9a21b-5736-4d37-a3ed-932f1801f00c",
  "f1cdbc02-017f-48e1-8258-d01161956ea8",
  "40ce3400-af05-4585-ad05-306c5db6c77c",
  "81781dd6-53be-485c-9ca5-2840b623bfb3",
  "ba76816d-0149-497c-8d23-afb33bd0a107",
  "6a01fa34-cdd1-4c5c-ad09-a881a2c6bc90",
  "71e79348-6afd-47f3-a1b6-5b0589b59449",
  "49950c19-70b7-4355-a0b1-7e21f698b5c5",
  "3b5f5951-5996-481b-bef3-f8d0a9764aa1",
  "f2ea35e0-28ec-4cf4-9444-29a0ddb53785",
  "47802cf7-683b-4038-8bdb-d864de6edfd4",
  "90cb9672-37fb-45d7-9993-4033ed7541f5",
  "da45183a-691a-444e-b1c1-1a5b6f252abb",
  "e47c1067-187d-45a2-8ff4-738d4cf9c3b0",
  "eec1652b-5bd5-4b1b-b678-5f057ad6335e",
  "717e03b2-8049-42f7-aead-f359d486a318",
  "aa34348a-bdaa-4a99-b8ee-0d1dcc6e905f",
  "113ba61c-2a2a-4973-876f-f54f6b9eeb40",
  "54b5adc8-a51b-4dbb-853e-a3e1d977c8d2",
  "adcddde4-2eb0-4444-a85e-260cfabc7625",
  "50957d6d-aa6f-49d4-b346-a5fd11d2b92d",
  "35a8a11d-1f6b-433b-bbbd-c40f3df0b197",
  "fc85de90-05a9-4dd8-993c-94bf32f83f1d",
  "16128252-276a-4c41-bf1f-ccc1925907e1",
  "4b8d3c34-7c9c-4a75-951a-cb998a48fad6",
  "40d0c6ec-4eba-49be-8d8e-890bd7a05734",
  "de43ce42-d503-427c-b6cb-1a15a564c8c6",
  "039cd469-f051-46e9-907b-8af546cfe5d9",
  "bbf80373-0c8e-4fd4-82f6-3370fbfc733b",
  "fbf47846-40c0-49af-b212-5d938df69e8d",
  "5c030f06-1b34-4cd6-9abc-81721f068bd2",
  "8079b7f9-6a4a-4141-914d-ad808f253244",
  "acf9edc4-0b59-4f89-bf17-51514c410cb2",
  "d544741d-a61f-4e9e-8385-c44e0027e15a",
  "05b49648-ad40-41b0-9114-812213baa60e",
  "63f0f0c3-a0ca-4d56-94fc-fb3f6323f346",
  "a529ab6a-0b30-4d21-babc-cfdbd184f7d9",
  "acb2d033-0664-42a9-934d-11767b6429bb",
  "126ee0aa-a227-4f20-8de7-8554495e59c1",
  "ddeba64a-0061-4cbe-96bf-e6f910bd5f56",
  "241fe6dc-e7ae-47e2-a2c3-acab19f05a53",
  "563e04e9-c24f-469f-aebd-6c90a22954dc",
  "91bdd754-d485-454f-87c1-9d83df69ffd4",
  "4c6dcd18-3396-45d7-ba90-55e492bd1792",
  "b5985f32-d847-46e0-a39c-25be5388f4d0",
  "3f57848e-63fb-4b4d-9133-ec6d74a9a1d6",
  "00ba306e-c6dc-4334-8f42-889d1586f583",
  "425a3e23-c9e8-4008-a002-ae65ce2966c1",
  "02c40dbf-c1fc-41a0-b6e3-4e2c683593b8",
  "d7f480da-2449-4ec7-8941-c936014140d2",
  "6a8d382b-dd11-4ddd-9274-99dc776b5ca7",
  "4a011f2f-e999-4689-84d4-c82b4abd8754",
  "599c5be7-2c8b-4873-88d1-f4e44044344a",
  "fe15ccfc-d440-46bc-a5e2-741b2990aeef",
  "fbff7bb8-f888-494a-b223-6011d17be76e",
  "d06023af-bd7e-4495-a3cb-86ac4d731645",
  "f6cac8e1-8459-4d3f-8d3b-c1bf3e52ed33",
  "213400cc-889e-4a04-9e19-784ea8988531",
  "4ea43dd6-934b-40d4-8b3b-bbc682aede9e",
  "9d805006-6f55-4d78-a2cd-1950a283ce18",
  "af96175e-6904-41ce-9340-eda313e11ac0",
  "3ecb72dc-e41f-4a79-803e-5f46afb65b85",
  "7786f44d-44b2-4da5-ab1f-00dad52534e1",
  "e6486d9a-d80a-4ba3-8db6-8ea75444b0cd",
  "64e19314-67b1-4cb6-9355-535f1b203460",
  "f9a37ee0-af01-446f-a119-b2f823951e05",
  "668409cb-561e-4af6-9092-94b8ceda5f6b",
  "802a50c5-b098-4776-9bfb-348d772e20ac",
  "b198013b-f918-4e41-afb3-92d1675bba81",
  "6bcc7ffe-2763-47e8-b916-05c3160999d2",
  "5bbe3fd5-9bcc-4d04-8286-542ee12e3bc6",
  "23561054-d404-4d43-ae4d-9179cae681bc",
  "b3d4ba50-cce5-4124-ae60-1bb20fd41de8",
  "750709b2-ae3b-46e2-9252-f703c86693ca",
  "1d548d45-cf82-4b60-aeac-100fa878cea5",
  "ff98afd4-f921-4edb-867e-a9af8447121b",
  "a5cf2659-8f06-4dfb-82b1-cd55a0201259",
  "e9fa9038-de61-4e72-8fa2-139ae900b35a",
  "d3c7f73e-cef5-4e45-aedd-8733c14026d4",
  "16a2ac1a-e958-4886-9f6c-671fde169dba",
  "b5bfbb4e-7daa-4f20-b516-ad8526374ebd",
  "9a071b6c-2f24-4e81-b020-dfa58cae7e82",
  "f546392d-49d0-4896-8a9b-555e4c89396a",
  "b51fe120-9d9f-41a5-9c07-6dedddac04cb",
  "795277da-c7ac-4446-b240-45165cb424e7",
  "6d29fb69-c592-4cb7-8f65-9ddd26cd93b1",
  "babe0e56-d96e-437e-a984-cff09791140a",
  "79e174ea-bc55-4384-ba54-c23db464fe3e",
  "7b39495e-5db2-4fd9-b12a-d611a4cef7a8",
  "9df48c54-6d5d-4cc4-bada-aa8db1d27c9d",
  "1c36120b-7cb0-47b4-918d-173b4eb1683b",
  "7a5c7e41-5791-4171-a711-df181a5b4859",
  "29a1aba0-fe45-4c99-9575-55bd4762ce27",
  "1d205d0f-7b26-47a8-b1d6-11589a6a305b",
  "69177e4f-6e13-420c-bdc2-42bd13230334",
  "b21b1aaf-61a6-4aa1-8c1c-35b3687f3100",
  "c4183140-7d00-4087-8a84-bddb08ba2079",
  "10081b12-36bb-4737-83f6-0ae657f2fa87",
  "40079067-1b51-4e7b-970d-50cda39207af",
  "3b5e22eb-1509-4c30-890f-107e27f71df2",
  "4ac58bbe-d7d3-4fcb-9c65-b678487d4f06",
  "265b75dc-182f-4d80-b868-5faf505695ea",
  "3bc24ebc-2265-439a-ba01-cd33e1bac36d",
  "b64713ea-bf89-43e3-8eab-b12b8a3bcf7e",
  "4a38b5d0-9333-47d6-8e14-f425ae71e750",
  "fc078c38-33d4-4fa9-bfc8-6843c4f2fa27",
  "867e0a53-f264-453d-a933-48dfc917c0bf",
  "ae8d84ac-8e33-4a0c-ba90-516d8b40fca8",
  "9840abbb-cac8-4064-835e-fd6a7f599d7d",
  "c1885c14-474b-4721-8146-22417f5da5c9",
  "18fcf607-ba8d-432a-b097-2208a091b58f",
  "7727fe84-22e7-48c4-bba7-9b95ab2b92e5",
  "580330d6-bb3d-4325-b07a-5a7016845330",
  "ee1e0c61-0fef-4a1b-b53c-a48f03f9bb70",
  "7990640f-1f58-4cf1-b108-34110ebf4829",
  "14cfc837-c977-4399-a0f3-7f15033ea395",
  "5e9b18cd-f806-490d-b491-27614cdca61f",
  "0d83f9ed-523a-43ff-bb23-f78090176f61",
  "b4af0fa3-a901-4e4c-bac7-bd9018837c1e",
  "de4c2d9a-6d54-4e71-addc-b9e33ad861ed",
  "9287354d-d467-4316-8fcb-7de0d5f3c0af",
  "3f5b9029-eefa-4da4-89b4-600ec9a548ca",
  "7d108d54-37be-48c5-8a12-a7c1682bdd10",
  "b8c11608-c7da-40b7-b5fc-532dfab91d31",
  "24cb6bba-371f-4879-a9cc-93fbfa85b49d",
  "37f19bfb-6bed-4c50-a049-76ce543eaf12",
  "6eca64da-3115-4b3e-a37d-31c494ffe18c",
  "a8730664-f8e3-4cac-baea-6d6d7fae0926",
  "64a9eea8-4a65-4879-a76e-22588648a517",
  "e81766ea-830d-4735-8891-6cb4339a948c",
  "1069c808-1243-4fdb-9432-b5c02ded964f",
  "f6e8f4da-349e-40d9-b839-bcb90084ce7a",
  "285f9166-d25d-44d6-9c89-4989596b7883",
  "161b18db-52fa-42bb-8692-fd49c7d341e1",
  "439c7c6d-c09d-4927-8ecb-e8607e2de0f1",
  "8d1ac6ec-a8e8-4c20-a0a5-b599e97c6395",
  "790f33ac-9dd7-4574-b842-a47f2790274c",
  "f2075c9e-8248-4476-9e41-f797af9896ba",
  "07335718-4436-4208-9299-73235f66370a",
  "505188f4-150a-4cdc-b45b-909eebfa129a",
  "df5a32d8-862f-4bd2-ad64-339ff30e8673",
  "73cf4593-cb3f-49e3-b9f1-a5b5bdbd7675",
  "0865f954-6bdd-40c9-9ce8-fabf6985766f",
  "9766b3d8-faf7-4330-b948-43edf932656c",
  "13af0e80-4aed-45e8-9394-642f176b0419",
  "ea0e948e-3847-4a95-8618-15f98fd5c580",
  "31baefd3-dedd-4454-832b-dc725fb5fa3e",
  "4fe6323d-c640-49e5-bf47-681d39ca1ed9",
  "13417f76-be97-4a38-a620-ff85795f1e3e",
  "f91a7ac4-0e41-4473-a8ea-ed99c617b9da",
  "9b743144-8218-4650-9b81-54ab5aa7ebc8",
  "a66d88e1-0976-479c-aaf5-9efa54a2b04d",
  "a090b6e6-a50d-4c79-8d73-5a05a41d94dd",
  "bbc51914-092d-4463-8dff-f6d7b0f1ea80",
  "b2f6a9d2-49b7-4ea8-9532-110e2b7f04a5",
  "225c98fa-ecb4-4943-9d34-5cb770824eab",
  "50136bf4-3a65-4129-9e4b-48a4357f0dc3",
  "9d8b42df-c286-4b80-98d2-6a2b55bbd283",
  "717b55f5-a17e-4616-84dd-9ddc8f66ce0f",
  "3d059ac1-eb25-48db-a080-6fc00ead0d5e",
  "6f9b445b-fb25-4b5c-98db-359e812acfbf",
  "3e0afb28-f14e-4d80-8f3f-22c17036e0c1",
  "58be47f3-b259-40d6-bd1e-343beb1e2f6f",
  "9c84a34b-9c5e-430b-9b10-805abd23fa6c",
  "b2f9bfe0-3101-425a-a532-9c6c31c75e3b",
  "ad743b11-ec21-48e2-86a0-0a722aa948c0",
  "6c7d8172-6631-410d-8341-0f12754f974a",
  "5dfb61df-f903-44d3-a6c1-f83e146c9759",
  "a61cda68-0876-49d2-921f-e6b82e50f23c",
  "1d562b8f-41a7-4f96-9a2d-138fef42ab09",
  "a4b7a8a8-1681-48ea-a35e-993bb5388bd6",
];

export const seedProfiles = Array.from({ length: SEED_COUNT }).map((_, i) =>
  makeSeedProfile(i)
);
