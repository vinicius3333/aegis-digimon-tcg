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
    src: "/sleeves/omnimon.webp",
  },
  {
    id: "alphamon",
    label: "Alphamon",
    collection: "Official Card Sleeves",
    src: "/sleeves/alphamon.webp",
  },
  {
    id: "imperialdramon-paladin",
    label: "Imperialdramon: Paladin Mode",
    collection: "Official Card Sleeves",
    src: "/sleeves/imperialdramon-paladin.webp",
  },
  {
    id: "gold",
    label: "Gold",
    collection: "Official Card Sleeves",
    src: "/sleeves/gold.webp",
  },
  {
    id: "silver",
    label: "Silver",
    collection: "Official Card Sleeves",
    src: "/sleeves/silver.webp",
  },
  {
    id: "animation-series-25th",
    label: "Digimon Animation Series 25th",
    collection: "Official Sleeves",
    src: "/sleeves/animation-series-25th.webp",
  },
  {
    id: "official-01-crowd",
    label: "Digimon Crowd",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-crowd.webp",
  },
  {
    id: "official-01-agumon",
    label: "Agumon and Friends",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-agumon.webp",
  },
  {
    id: "official-01-appmon",
    label: "Appmon",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-appmon.webp",
  },
  {
    id: "official-01-silver-hair",
    label: "Silver Hair",
    collection: "Official Card Sleeves 01",
    src: "/sleeves/official-01-silver-hair.webp",
  },
  {
    id: "official-02-light-blue",
    label: "Cyber Sleuth: Light Blue",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-light-blue.webp",
  },
  {
    id: "official-02-crimson",
    label: "Cyber Sleuth: Crimson",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-crimson.webp",
  },
  {
    id: "official-02-navy",
    label: "Cyber Sleuth: Navy",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-navy.webp",
  },
  {
    id: "official-02-yellow",
    label: "Cyber Sleuth: Yellow",
    collection: "Official Card Sleeves 02",
    src: "/sleeves/official-02-yellow.webp",
  },
  {
    id: "official-03-adventure",
    label: "Adventure",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-adventure.webp",
  },
  {
    id: "official-03-chronicle",
    label: "Chronicle",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-chronicle.webp",
  },
  {
    id: "official-03-generations",
    label: "Generations",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-generations.webp",
  },
  {
    id: "official-03-ghost-game",
    label: "Ghost Game",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-ghost-game.webp",
  },
  {
    id: "official-04-blue-knights",
    label: "Blue Knights",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-blue-knights.webp",
  },
  {
    id: "official-04-crimson-knights",
    label: "Crimson Knights",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-crimson-knights.webp",
  },
  {
    id: "official-04-baby-digimon",
    label: "Baby Digimon",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-baby-digimon.webp",
  },
  {
    id: "official-04-fire-and-ice",
    label: "Fire and Ice",
    collection: "Official Card Sleeves 04",
    src: "/sleeves/official-04-fire-and-ice.webp",
  },
  {
    id: "official-2025v1-dark-angel",
    label: "Dark Angel",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-dark-angel.webp",
  },
  {
    id: "official-2025v1-impmon",
    label: "Impmon",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-impmon.webp",
  },
  {
    id: "official-2025v1-blue-flame",
    label: "Blue Flame",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-blue-flame.webp",
  },
  {
    id: "official-2025v1-gold-emblem",
    label: "Gold Emblem",
    collection: "Official Sleeves 2025 Ver.1.0",
    src: "/sleeves/official-2025v1-gold-emblem.webp",
  },
  {
    id: "official-2024v2-purple-gold",
    label: "Purple and Gold",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-purple-gold.webp",
  },
  {
    id: "official-2024v2-adventure-partners",
    label: "Adventure Partners",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-adventure-partners.webp",
  },
  {
    id: "official-2024v2-green",
    label: "Green Line Art",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-green.webp",
  },
  {
    id: "official-2024v2-gold",
    label: "Gold Line Art",
    collection: "Official Sleeves 2024 Ver.2.0",
    src: "/sleeves/official-2024v2-gold.webp",
  },
  {
    id: "official-2024v1-agumon",
    label: "Agumon Spotlight",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-agumon.webp",
  },
  {
    id: "official-2024v1-throne",
    label: "Throne",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-throne.webp",
  },
  {
    id: "official-2024v1-neon-back",
    label: "Neon Card Back",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-neon-back.webp",
  },
  {
    id: "official-2024v1-white-back",
    label: "White Card Back",
    collection: "Official Sleeves 2024 Ver.1.0",
    src: "/sleeves/official-2024v1-white-back.webp",
  },
  {
    id: "official-2023-tai-agumon",
    label: "Tai and Agumon",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-tai-agumon.webp",
  },
  {
    id: "official-2023-matt-gabumon",
    label: "Matt and Gabumon",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-matt-gabumon.webp",
  },
  {
    id: "official-2023-loogamon",
    label: "Loogamon",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-loogamon.webp",
  },
  {
    id: "official-2023-shattered-glass",
    label: "Shattered Glass",
    collection: "Official Sleeves 2023",
    src: "/sleeves/official-2023-shattered-glass.webp",
  },
  {
    id: "official-2022v2-laptop",
    label: "Laptop Tamer",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-laptop.webp",
  },
  {
    id: "official-2022v2-blue-dragons",
    label: "Blue Dragons",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-blue-dragons.webp",
  },
  {
    id: "official-2022v2-red-hexagons",
    label: "Red Hexagons",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-red-hexagons.webp",
  },
  {
    id: "official-2022v2-flames",
    label: "Flames",
    collection: "Official Sleeves 2022 Ver.2.0",
    src: "/sleeves/official-2022v2-flames.webp",
  },
  {
    id: "official-2022-snowfall",
    label: "Snowfall",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-snowfall.webp",
  },
  {
    id: "official-2022-red-black",
    label: "Red and Black",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-red-black.webp",
  },
  {
    id: "official-2022-shoutmon",
    label: "Shoutmon",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-shoutmon.webp",
  },
  {
    id: "official-2022-meadow",
    label: "Meadow",
    collection: "Official Sleeves 2022",
    src: "/sleeves/official-2022-meadow.webp",
  },
  {
    id: "official-2021v2-terriermon-lopmon",
    label: "Terriermon and Lopmon",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-terriermon-lopmon.webp",
  },
  {
    id: "official-2021v2-red-purple",
    label: "Red and Purple",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-red-purple.webp",
  },
  {
    id: "official-2021v2-imperialdramon",
    label: "Imperialdramon",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-imperialdramon.webp",
  },
  {
    id: "official-2021v2-gold-line-art",
    label: "Gold Line Art",
    collection: "Official Sleeves 2021 Ver.2.0",
    src: "/sleeves/official-2021v2-gold-line-art.webp",
  },
  {
    id: "official-2021-armored-dragons",
    label: "Armored Dragons",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-armored-dragons.webp",
  },
  {
    id: "official-2021-agumon-gabumon",
    label: "Agumon and Gabumon",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-agumon-gabumon.webp",
  },
  {
    id: "official-2021-city-battle",
    label: "City Battle",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-city-battle.webp",
  },
  {
    id: "official-2021-pulsemon",
    label: "Pulsemon",
    collection: "Official Sleeves 2021",
    src: "/sleeves/official-2021-pulsemon.webp",
  },
  {
    id: "official-2020-omnimon",
    label: "Omnimon",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-omnimon.webp",
  },
  {
    id: "official-2020-agumon",
    label: "Agumon Line Art",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-agumon.webp",
  },
  {
    id: "official-2020-in-training",
    label: "In-Training",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-in-training.webp",
  },
  {
    id: "official-2020-blue-back",
    label: "Blue Card Back",
    collection: "Official Sleeves 2020",
    src: "/sleeves/official-2020-blue-back.webp",
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
