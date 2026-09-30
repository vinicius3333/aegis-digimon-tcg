import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.sleeve";

export interface CardSleeve {
  id: string;
  label: string;
  collection: string;
  src?: string;
}

export const CARD_SLEEVES: readonly CardSleeve[] = [
  {
    id: "digimon-standard",
    label: "Digimon Card Game",
    collection: "Standard Card Back",
    src: "/sleeves/digimon-standard.webp",
  },
  {
    id: "classic",
    label: "Aegis",
    collection: "Original",
  },
  {
    id: "omnimon",
    label: "Omnimon",
    collection: "Official Card Sleeves",
    src: "/sleeves/omnimon.png",
  },
  {
    id: "alphamon",
    label: "Alphamon",
    collection: "Official Card Sleeves",
    src: "/sleeves/alphamon.png",
  },
  {
    id: "imperialdramon-paladin",
    label: "Imperialdramon: Paladin Mode",
    collection: "Official Card Sleeves",
    src: "/sleeves/imperialdramon-paladin.png",
  },
  {
    id: "gold",
    label: "Gold",
    collection: "Official Card Sleeves",
    src: "/sleeves/gold.png",
  },
  {
    id: "silver",
    label: "Silver",
    collection: "Official Card Sleeves",
    src: "/sleeves/silver.png",
  },
  {
    id: "animation-series-25th",
    label: "Digimon Animation Series 25th",
    collection: "Official Sleeves",
    src: "/sleeves/animation-series-25th.png",
  },
  {
    id: "official-01-crowd",
    label: "Digimon Crowd",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-crowd.png",
  },
  {
    id: "official-01-agumon",
    label: "Agumon and Friends",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-agumon.png",
  },
  {
    id: "official-01-appmon",
    label: "Appmon",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-appmon.png",
  },
  {
    id: "official-01-silver-hair",
    label: "Silver Hair",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-silver-hair.png",
  },
  {
    id: "official-02-light-blue",
    label: "Cyber Sleuth: Light Blue",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-light-blue.png",
  },
  {
    id: "official-02-crimson",
    label: "Cyber Sleuth: Crimson",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-crimson.png",
  },
  {
    id: "official-02-navy",
    label: "Cyber Sleuth: Navy",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-navy.png",
  },
  {
    id: "official-02-yellow",
    label: "Cyber Sleuth: Yellow",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-yellow.png",
  },
  {
    id: "official-03-adventure",
    label: "Adventure",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-adventure.png",
  },
  {
    id: "official-03-chronicle",
    label: "Chronicle",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-chronicle.png",
  },
  {
    id: "official-03-generations",
    label: "Generations",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-generations.png",
  },
  {
    id: "official-03-ghost-game",
    label: "Ghost Game",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-ghost-game.png",
  },
  {
    id: "official-04-blue-knights",
    label: "Blue Knights",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-blue-knights.png",
  },
  {
    id: "official-04-crimson-knights",
    label: "Crimson Knights",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-crimson-knights.png",
  },
  {
    id: "official-04-baby-digimon",
    label: "Baby Digimon",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-baby-digimon.png",
  },
  {
    id: "official-04-fire-and-ice",
    label: "Fire and Ice",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-fire-and-ice.png",
  },
  {
    id: "official-2025v1-dark-angel",
    label: "Dark Angel",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-dark-angel.png",
  },
  {
    id: "official-2025v1-impmon",
    label: "Impmon",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-impmon.png",
  },
  {
    id: "official-2025v1-blue-flame",
    label: "Blue Flame",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-blue-flame.png",
  },
  {
    id: "official-2025v1-gold-emblem",
    label: "Gold Emblem",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-gold-emblem.png",
  },
  {
    id: "official-2024v2-purple-gold",
    label: "Purple and Gold",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-purple-gold.png",
  },
  {
    id: "official-2024v2-adventure-partners",
    label: "Adventure Partners",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-adventure-partners.png",
  },
  {
    id: "official-2024v2-green",
    label: "Green Line Art",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-green.png",
  },
  {
    id: "official-2024v2-gold",
    label: "Gold Line Art",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-gold.png",
  },
  {
    id: "official-2024v1-agumon",
    label: "Agumon Spotlight",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-agumon.png",
  },
  {
    id: "official-2024v1-throne",
    label: "Throne",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-throne.png",
  },
  {
    id: "official-2024v1-neon-back",
    label: "Neon Card Back",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-neon-back.png",
  },
  {
    id: "official-2024v1-white-back",
    label: "White Card Back",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-white-back.png",
  },
  {
    id: "official-2023-tai-agumon",
    label: "Tai and Agumon",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-tai-agumon.png",
  },
  {
    id: "official-2023-matt-gabumon",
    label: "Matt and Gabumon",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-matt-gabumon.png",
  },
  {
    id: "official-2023-loogamon",
    label: "Loogamon",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-loogamon.png",
  },
  {
    id: "official-2023-shattered-glass",
    label: "Shattered Glass",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-shattered-glass.png",
  },
  {
    id: "official-2022v2-laptop",
    label: "Laptop Tamer",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-laptop.png",
  },
  {
    id: "official-2022v2-blue-dragons",
    label: "Blue Dragons",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-blue-dragons.png",
  },
  {
    id: "official-2022v2-red-hexagons",
    label: "Red Hexagons",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-red-hexagons.png",
  },
  {
    id: "official-2022v2-flames",
    label: "Flames",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-flames.png",
  },
  {
    id: "official-2022-snowfall",
    label: "Snowfall",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-snowfall.png",
  },
  {
    id: "official-2022-red-black",
    label: "Red and Black",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-red-black.png",
  },
  {
    id: "official-2022-shoutmon",
    label: "Shoutmon",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-shoutmon.png",
  },
  {
    id: "official-2022-meadow",
    label: "Meadow",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-meadow.png",
  },
  {
    id: "official-2021v2-terriermon-lopmon",
    label: "Terriermon and Lopmon",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-terriermon-lopmon.png",
  },
  {
    id: "official-2021v2-red-purple",
    label: "Red and Purple",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-red-purple.png",
  },
  {
    id: "official-2021v2-imperialdramon",
    label: "Imperialdramon",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-imperialdramon.png",
  },
  {
    id: "official-2021v2-gold-line-art",
    label: "Gold Line Art",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-gold-line-art.png",
  },
  {
    id: "official-2021-armored-dragons",
    label: "Armored Dragons",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-armored-dragons.png",
  },
  {
    id: "official-2021-agumon-gabumon",
    label: "Agumon and Gabumon",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-agumon-gabumon.png",
  },
  {
    id: "official-2021-city-battle",
    label: "City Battle",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-city-battle.png",
  },
  {
    id: "official-2021-pulsemon",
    label: "Pulsemon",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-pulsemon.png",
  },
  {
    id: "official-2020-omnimon",
    label: "Omnimon",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-omnimon.png",
  },
  {
    id: "official-2020-agumon",
    label: "Agumon Line Art",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-agumon.png",
  },
  {
    id: "official-2020-in-training",
    label: "In-Training",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-in-training.png",
  },
  {
    id: "official-2020-blue-back",
    label: "Blue Card Back",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-blue-back.png",
  },
];

export const DEFAULT_CARD_SLEEVE = CARD_SLEEVES[0]!;

const listeners = new Set<() => void>();

function isCardSleeveId(id: string | null): id is string {
  return CARD_SLEEVES.some((sleeve) => sleeve.id === id);
}

function readId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isCardSleeveId(stored) ? stored : DEFAULT_CARD_SLEEVE.id;
  } catch {
    return DEFAULT_CARD_SLEEVE.id;
  }
}

let currentId = readId();

export function getCardSleeveId(): string {
  return currentId;
}

export function setCardSleeveId(id: string): void {
  if (!isCardSleeveId(id)) return;
  currentId = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // The sleeve is cosmetic; a blocked storage still applies for this session.
  }
  for (const listener of listeners) listener();
}

export function subscribeCardSleeve(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cardSleeveById(id: string): CardSleeve {
  return CARD_SLEEVES.find((sleeve) => sleeve.id === id) ?? DEFAULT_CARD_SLEEVE;
}

export function useCardSleeve(): CardSleeve {
  const id = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);
  return cardSleeveById(id);
}
