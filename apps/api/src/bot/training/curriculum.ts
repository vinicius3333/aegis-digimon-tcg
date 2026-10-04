import { createHash } from "node:crypto";
import { assertLegalDeck } from "../../engine/testDecks.js";
import { TRAINING_DECK_VERSIONS, trainingDeck } from "./decks.js";

// Complementary learning recipes, separate from the 26 catalog decks used for strength evaluation.
// Counts give the remaining set cards real evolution lines, partners, Tamers, and effect targets.
interface Recipe {
  version: string;
  name: string;
  egg: string;
  main: readonly (readonly [string, number])[];
}

const RECIPES: readonly Recipe[] = [
  {
    version: "curriculum-data-squad-rosemon@1",
    name: "DATA SQUAD Rosemon",
    egg: "BT26-002", // Budmon
    main: [
      ["BT26-036", 4], // Lalamon
      ["BT26-034", 4], // Palmon
      ["BT26-035", 4], // Morphomon
      ["BT26-039", 4], // Sunflowmon
      ["BT26-027", 2], // Petermon
      ["BT26-041", 2], // Hudiemon
      ["BT26-038", 2], // Kuwagamon
      ["BT26-044", 4], // Lilamon
      ["BT26-043", 2], // Piximon
      ["BT26-042", 2], // Okuwamon
      ["BT26-049", 4], // Rosemon
      ["BT26-032", 2], // Ceresmon
      ["BT26-050", 2], // Rosemon: Burst Mode
      ["BT26-091", 4], // Yoshino Fujieda
      ["BT26-090", 2], // Kanan Yuki
      ["BT26-098", 4], // Queen of Thorns
      ["BT26-099", 2], // Training Manual
    ],
  },
  {
    version: "curriculum-data-squad-ravemon@1",
    name: "DATA SQUAD Ravemon",
    egg: "BT26-005", // Pinamon
    main: [
      ["BT26-065", 4], // Falcomon
      ["BT26-062", 4], // Ghostmon
      ["BT26-064", 4], // DemiDevimon
      ["BT26-072", 4], // Peckmon
      ["BT26-071", 4], // Flarerizamon
      ["BT26-067", 2], // Wizardmon
      ["BT26-076", 4], // Crowmon
      ["BT26-074", 4], // Cerberusmon
      ["BT26-082", 4], // Ravemon
      ["BT26-080", 2], // Bacchusmon
      ["BT26-077", 2], // Reapermon
      ["BT26-094", 4], // Keenan Crier
      ["BT26-095", 2], // Makoto Kuonji
      ["BT26-100", 4], // Dark Field
      ["BT26-101", 2], // Cross Arts
    ],
  },
  {
    version: "curriculum-beatbreak-black@1",
    name: "Black BEATBREAK",
    egg: "BT26-003", // Kyaromon
    main: [
      ["BT26-052", 4], // Pristimon
      ["EX13-048", 4], // Kotemon
      ["EX13-047", 4], // Gotsumon
      ["BT26-053", 4], // Wolvermon
      ["EX13-052", 4], // Gladimon
      ["EX13-053", 2], // Thundermon
      ["BT26-057", 4], // Bearcatmon
      ["BT25-057", 4], // Monarchlizamon
      ["BT26-058", 2], // HiAndromon
      ["EX13-062", 2], // Craniamon
      ["ST23-09", 2], // Atratusmon
      ["BT26-093", 4], // Reina Sakuya
      ["ST23-13", 4], // Tomoro Tenma & Kyo Sawashiro
      ["ST23-15", 4], // e-Pulse
      ["BT25-043", 2], // Habakirimon
    ],
  },
  {
    version: "curriculum-beatbreak-purple@1",
    name: "Purple BEATBREAK",
    egg: "BT26-004", // Pagumon
    main: [
      ["BT26-061", 4], // Chiropmon
      ["ST23-12", 4], // Chiropmon
      ["BT26-062", 4], // Ghostmon
      ["BT26-070", 4], // NightChiropmon
      ["BT26-071", 4], // Flarerizamon
      ["BT26-067", 2], // Wizardmon
      ["BT26-075", 4], // ScourgeChiropmon
      ["BT26-074", 4], // Cerberusmon
      ["ST23-09", 2], // Atratusmon
      ["BT26-080", 2], // Bacchusmon
      ["BT26-082", 2], // Ravemon
      ["BT26-095", 4], // Makoto Kuonji
      ["ST23-13", 4], // Tomoro Tenma & Kyo Sawashiro
      ["ST23-15", 4], // e-Pulse
      ["BT25-043", 2], // Habakirimon
    ],
  },
  {
    version: "curriculum-cs-hiandromon@1",
    name: "CS HiAndromon",
    egg: "BT22-005", // Tsumemon
    main: [
      ["EX13-048", 4], // Kotemon
      ["EX13-047", 4], // Gotsumon
      ["EX13-046", 4], // Kokuwamon
      ["EX13-052", 4], // Gladimon
      ["EX13-051", 4], // Guardromon
      ["EX13-054", 2], // Nanimon
      ["BT26-054", 4], // Andromon
      ["EX13-058", 4], // Knightmon
      ["BT26-058", 4], // HiAndromon
      ["EX13-062", 2], // Craniamon
      ["BT22-090", 4], // Rie Kishibe
      ["EX13-074", 4], // Rie Kishibe
      ["P-039", 4], // Black Memory Boost!
      ["P-107", 2], // Defense Training
    ],
  },
  {
    version: "curriculum-dm-ver3@1",
    name: "DM Ver.3 Giromon / Reapermon",
    egg: "BT23-002", // Yokomon
    main: [
      ["BT26-034", 4], // Palmon
      ["BT26-035", 4], // Morphomon
      ["EX13-038", 4], // Salamon
      ["BT26-040", 4], // Drimogemon
      ["BT26-038", 4], // Kuwagamon
      ["EX13-040", 2], // Mikemon
      ["BT26-055", 4], // Giromon
      ["BT26-042", 4], // Okuwamon
      ["BT26-077", 4], // Reapermon
      ["BT26-046", 2], // Gryphonmon
      ["BT26-090", 4], // Kanan Yuki
      ["BT26-091", 4], // Yoshino Fujieda
      ["BT26-099", 4], // Training Manual
      ["BT26-032", 2], // Ceresmon
    ],
  },
  {
    version: "curriculum-dm-ver4@1",
    name: "DM Ver.4 Piximon / BloomLordmon",
    egg: "EX13-002", // DemiVeemon
    main: [
      ["BT26-018", 4], // Sangomon
      ["BT22-017", 4], // Gabumon
      ["EX13-017", 4], // Veemon
      ["BT26-023", 4], // Mojyamon
      ["BT26-020", 4], // ShellNumemon
      ["BT26-022", 2], // Sorcermon
      ["BT26-043", 4], // Piximon
      ["EX13-041", 4], // Groundramon
      ["BT26-048", 4], // BloomLordmon
      ["BT26-046", 2], // Gryphonmon
      ["EX13-069", 4], // Rina Shinomiya
      ["BT26-090", 4], // Kanan Yuki
      ["BT26-099", 4], // Training Manual
      ["BT24-091", 2], // Tidal Stream
    ],
  },
  {
    version: "curriculum-nsp-insects@1",
    name: "NSp Morphomon / Hudiemon",
    egg: "BT23-002", // Yokomon
    main: [
      ["BT26-035", 4], // Morphomon
      ["BT26-034", 4], // Palmon
      ["EX13-038", 4], // Salamon
      ["BT26-041", 4], // Hudiemon
      ["BT26-038", 4], // Kuwagamon
      ["EX12-042", 2], // Gatomon
      ["BT26-042", 4], // Okuwamon
      ["BT26-043", 4], // Piximon
      ["BT26-045", 4], // GranKuwagamon
      ["BT26-047", 2], // TyrantKabuterimon
      ["BT26-090", 4], // Kanan Yuki
      ["BT26-091", 4], // Yoshino Fujieda
      ["BT26-032", 4], // Ceresmon
      ["BT26-099", 2], // Training Manual
    ],
  },
  {
    version: "curriculum-ds-blue@1",
    name: "DS Sangomon / ShellNumemon",
    egg: "EX13-002", // DemiVeemon
    main: [
      ["BT26-018", 4], // Sangomon
      ["EX13-017", 4], // Veemon
      ["BT22-017", 4], // Gabumon
      ["BT26-020", 4], // ShellNumemon
      ["BT22-022", 4], // Veedramon
      ["BT26-022", 2], // Sorcermon
      ["BT22-023", 4], // AeroVeedramon
      ["EX13-021", 4], // Wingdramon
      ["BT22-025", 4], // UlforceVeedramon
      ["BT22-026", 2], // MetalGarurumon
      ["EX13-069", 4], // Rina Shinomiya
      ["BT22-085", 4], // Rina Shinomiya
      ["BT24-091", 4], // Tidal Stream
      ["EX13-067", 2], // Nokia Shiramine
    ],
  },
  {
    version: "curriculum-wg-fairies@1",
    name: "WG Tinkermon / Petermon",
    egg: "EX13-003", // Kyaromon
    main: [
      ["BT26-024", 4], // Tinkermon
      ["BT26-034", 4], // Palmon
      ["BT26-036", 4], // Lalamon
      ["BT26-027", 4], // Petermon
      ["BT26-039", 4], // Sunflowmon
      ["BT26-041", 2], // Hudiemon
      ["BT26-044", 4], // Lilamon
      ["BT26-043", 4], // Piximon
      ["BT26-049", 4], // Rosemon
      ["BT26-032", 2], // Ceresmon
      ["BT26-091", 4], // Yoshino Fujieda
      ["BT26-090", 4], // Kanan Yuki
      ["BT26-098", 4], // Queen of Thorns
      ["BT26-050", 2], // Rosemon: Burst Mode
    ],
  },
  {
    version: "curriculum-shambala-zanbamon@1",
    name: "Shambala Musyamon / Zanbamon",
    egg: "BT26-001", // Yokomon
    main: [
      ["BT26-008", 4], // Kotemon
      ["BT26-009", 4], // Hyokomon
      ["EX12-061", 4], // Hanimon
      ["BT26-013", 4], // Musyamon
      ["BT26-011", 4], // Buraimon
      ["BT26-012", 2], // Manekimon
      ["BT26-015", 4], // Butenmon
      ["BT26-029", 4], // Aegiochusmon: Holy
      ["BT26-017", 4], // Zanbamon
      ["BT26-016", 2], // Chronomon: Holy Mode
      ["BT26-088", 4], // Hiroko Sagisaka
      ["BT26-087", 4], // Toya Kuga
      ["BT26-104", 4], // Kunlun
      ["BT26-085", 2], // Giant Slayer
    ],
  },
  {
    version: "curriculum-iliad-yellow@1",
    name: "Iliad Ceresmon / Thunder Emperor",
    egg: "BT24-003", // Tsunomon
    main: [
      ["BT26-024", 4], // Tinkermon
      ["EX13-026", 4], // Kudamon
      ["BT26-034", 4], // Palmon
      ["BT26-027", 4], // Petermon
      ["BT26-022", 4], // Sorcermon
      ["EX13-030", 2], // Reppamon
      ["BT26-030", 4], // Pumpkinmon
      ["BT26-029", 4], // Aegiochusmon: Holy
      ["BT26-032", 4], // Ceresmon
      ["BT26-033", 2], // Jupitermon
      ["BT26-088", 4], // Hiroko Sagisaka
      ["BT26-090", 4], // Kanan Yuki
      ["BT26-097", 4], // The Thunder Emperor Awakens
      ["BT26-101", 2], // Cross Arts
    ],
  },
  {
    version: "curriculum-iliad-purple@1",
    name: "Iliad Bacchusmon / Mervamon",
    egg: "BT24-007", // Tsunomon
    main: [
      ["BT26-064", 4], // DemiDevimon
      ["BT26-066", 4], // Salamon
      ["BT25-078", 4], // Gazimon
      ["BT26-067", 4], // Wizardmon
      ["BT26-068", 4], // Devimon
      ["BT26-021", 2], // Gekomon
      ["BT26-030", 4], // Pumpkinmon
      ["BT26-073", 4], // Aegiochusmon: Dark
      ["BT26-080", 4], // Bacchusmon
      ["BT26-081", 2], // Mervamon
      ["BT26-090", 4], // Kanan Yuki
      ["BT26-088", 4], // Hiroko Sagisaka
      ["BT26-101", 4], // Cross Arts
      ["BT26-100", 2], // Dark Field
    ],
  },
  {
    version: "curriculum-sukamon-etemon@1",
    name: "Sukamon / KingEtemon",
    egg: "EX13-003", // Kyaromon
    main: [
      ["EX13-027", 4], // Chuumon
      ["EX13-025", 4], // Candlemon
      ["EX13-050", 4], // Bokomon
      ["EX13-028", 4], // Sukamon
      ["EX13-054", 4], // Nanimon
      ["EX13-030", 2], // Reppamon
      ["EX13-031", 4], // KingSukamon
      ["EX13-059", 4], // BigMamemon
      ["EX13-035", 4], // KingEtemon
      ["EX13-063", 2], // PrinceMamemon
      ["EX13-071", 4], // Richard Sampson
      ["EX13-074", 4], // Rie Kishibe
      ["P-235", 4], // Digital Accident Tactics Squad
      ["LM-054", 2], // Treadmill Training
    ],
  },
  {
    version: "curriculum-bagra-darkknightmon@1",
    name: "Bagra Army / DarkKnightmon",
    egg: "BT26-006", // Monimon
    main: [
      ["BT26-061", 4], // Chiropmon
      ["BT26-064", 4], // DemiDevimon
      ["BT26-065", 4], // Falcomon
      ["EX10-026", 4], // SkullKnightmon
      ["EX10-027", 4], // DeadlyAxemon
      ["BT26-068", 2], // Devimon
      ["EX10-031", 4], // DarkKnightmon
      ["BT26-056", 4], // Cerberusmon: Werewolf Mode
      ["BT26-077", 4], // Reapermon
      ["EX13-064", 2], // LordKnightmon
      ["BT26-095", 4], // Makoto Kuonji
      ["EX13-074", 4], // Rie Kishibe
      ["BT26-100", 4], // Dark Field
      ["BT25-085", 2], // BeelStarmon
    ],
  },
  {
    version: "curriculum-nso-ghostmon@1",
    name: "NSo Ghostmon / Flarerizamon",
    egg: "BT26-004", // Pagumon
    main: [
      ["BT26-062", 4], // Ghostmon
      ["BT26-064", 4], // DemiDevimon
      ["BT26-065", 4], // Falcomon
      ["BT26-071", 4], // Flarerizamon
      ["BT26-067", 4], // Wizardmon
      ["BT26-068", 2], // Devimon
      ["BT26-074", 4], // Cerberusmon
      ["BT26-076", 4], // Crowmon
      ["BT26-082", 4], // Ravemon
      ["BT26-080", 2], // Bacchusmon
      ["BT26-095", 4], // Makoto Kuonji
      ["BT26-094", 4], // Keenan Crier
      ["BT26-100", 4], // Dark Field
      ["BT25-085", 2], // BeelStarmon
    ],
  },
  {
    version: "curriculum-appmon-charismon@1",
    name: "Appmon Sociamon / Gossipmon / Charismon",
    egg: "BT26-007", // Swipemon
    main: [
      ["BT26-010", 4], // Roleplaymon
      ["BT26-019", 4], // Mailmon
      ["BT26-051", 4], // Gomimon
      ["BT26-063", 4], // Tellermon
      ["BT26-084", 4], // Copipemon
      ["BT21-043", 4], // Sociamon
      ["BT21-070", 4], // Gossipmon
      ["BT26-028", 4], // Medicmon
      ["BT26-037", 4], // Weatherdramon
      ["EX10-017", 4], // Mienumon
      ["BT21-073", 4], // Charismon
      ["BT24-099", 4], // Super Hacking
      ["BT26-099", 2], // Training Manual
    ],
  },
  {
    version: "curriculum-appmon-mienumon@1",
    name: "Appmon Mirrormon / Kabemon / Copipemon / Mienumon",
    egg: "BT26-007", // Swipemon
    main: [
      ["EX10-016", 4], // Mirrormon
      ["EX10-024", 4], // Kabemon
      ["BT26-084", 4], // Copipemon
      ["EX10-038", 4], // Copipemon
      ["BT26-063", 4], // Tellermon
      ["BT26-051", 4], // Gomimon
      ["EX10-017", 4], // Mienumon
      ["BT26-028", 4], // Medicmon
      ["BT26-037", 4], // Weatherdramon
      ["BT21-071", 4], // Scopemon
      ["BT21-073", 2], // Charismon
      ["BT24-099", 4], // Super Hacking
      ["BT26-099", 4], // Training Manual
    ],
  },
];

/** Include every complementary recipe identity in the encoder, including its named partners. */
export function curriculumCardIds(): string[] {
  return RECIPES.flatMap(({ egg, main }) => [egg, ...main.map(([id]) => id)]);
}

export const CURRICULUM_DECK_VERSIONS: readonly string[] = [
  ...TRAINING_DECK_VERSIONS,
  ...RECIPES.map(({ version }) => version),
];

/** Resolve only pinned, legal recipes; unknown custom decks cannot enter a recorded run. */
export function episodeDeck(version: string) {
  const recipe = RECIPES.find((entry) => entry.version === version);
  if (recipe === undefined) return trainingDeck(version);
  const deck = {
    mainDeck: recipe.main.flatMap(([id, count]) => Array<string>(count).fill(id)),
    eggDeck: Array<string>(4).fill(recipe.egg),
  };
  assertLegalDeck(deck);
  const sha256 = createHash("sha256").update(JSON.stringify(deck)).digest("hex");
  return { version, name: recipe.name, sha256, deck };
}

export function curriculumManifest(engineSha256: string) {
  return {
    schemaVersion: 1,
    engineSha256,
    decks: CURRICULUM_DECK_VERSIONS.map(episodeDeck).map(({ version, name, sha256 }) => ({ version, name, sha256 })),
  };
}
