import { CardColor, CardKind } from "../schema/enums.js";
import type { CardDefinition } from "./types.js";

/** Synthetic token definitions (not in the printed card corpus). */
export const tokenDefinitions: readonly CardDefinition[] = [
  tok("Diaboromon", {
    level: 6,
    dp: 3000,
    playCost: 14,
    colors: [CardColor.White],
    types: ["Unknown", "Unidentified"],
  }),
  tok("Diaboromon Token", {
    level: 6,
    dp: 3000,
    playCost: 14,
    colors: [CardColor.White],
    types: ["Unknown", "Unidentified"],
  }),
  tok("Familiar Token", { level: 3, dp: 3000, playCost: 0, colors: [CardColor.Yellow] }),
  tok("SelfDeleteFamiliar Token", { level: 3, dp: 1000, playCost: 0, colors: [CardColor.Purple] }),
  tok("Amon of Crimson Flame", { dp: 6000, playCost: -1, colors: [CardColor.Red], effectText: "＜Rush＞" }),
  tok("Umon of Blue Thunder", { dp: 6000, playCost: -1, colors: [CardColor.Yellow], effectText: "＜Blocker＞" }),
  tok("KoHagurumon Token", { level: 3, dp: 3000, playCost: 3, colors: [CardColor.Black] }),
  tok("WarGrowlmon Token", { level: 5, dp: 5000, playCost: 5, colors: [CardColor.Red] }),
  tok("Taomon Token", { level: 4, dp: 4000, playCost: 4, colors: [CardColor.Yellow] }),
  tok("Rapidmon Token", { level: 5, dp: 5000, playCost: 5, colors: [CardColor.Yellow] }),
  tok("AthoRenePor Token", { level: 6, dp: 6000, playCost: 6, colors: [CardColor.White] }),
  tok("Petrification Token", { dp: 3000, playCost: -1, colors: [CardColor.White] }),
  tok("Hinukamuy Token", { dp: 6000, playCost: -1, colors: [CardColor.White] }),
  tok("Fujitsumon Token", { level: 4, dp: 3000, playCost: 0, colors: [CardColor.Purple] }),
  tok("Uka no Mitama", {
    dp: 9000,
    playCost: -1,
    colors: [CardColor.Yellow],
    effectText: "＜Rush＞",
  }),
  tok("Gyuukimon Token", {
    level: 5,
    dp: 3000,
    playCost: 7,
    colors: [CardColor.Purple],
    forms: ["Ultimate"],
    attributes: ["Virus"],
    types: ["Dark Animal"],
  }),
  tok("Pipe Fox", {
    level: 4,
    dp: 6000,
    playCost: 4,
    colors: [CardColor.Yellow],
    effectText: "＜Blocker＞",
  }),
  tok("Paishu", { dp: 6000, playCost: 0, colors: [CardColor.Yellow] }),
  tok("Kotenken", {
    dp: 9000,
    playCost: -1,
    colors: [CardColor.Black],
    effectText: "＜Blocker＞",
  }),
];

function tok(
  nameEn: string,
  stats: {
    level?: number;
    dp: number;
    playCost: number;
    colors: CardColor[];
    forms?: string[];
    attributes?: string[];
    types?: string[];
    effectText?: string;
  },
): CardDefinition {
  const slug = nameEn.replace(/\s+/g, "-");
  return {
    cardId: `TOKEN-${slug}`,
    set: "TOKEN",
    nameEn,
    kinds: [CardKind.Digimon],
    colors: stats.colors,
    ...(stats.level !== undefined ? { level: stats.level } : {}),
    playCost: stats.playCost,
    dp: stats.dp,
    evoCosts: [],
    ...(stats.forms !== undefined ? { forms: stats.forms } : {}),
    ...(stats.attributes !== undefined ? { attributes: stats.attributes } : {}),
    types: stats.types,
    effectText: stats.effectText,
    maxCountInDeck: 0,
    isToken: true,
  };
}

/** Map PlayToken IR name tokens to synthetic card ids. */
export function resolveTokenCardId(tokenName: string): string | undefined {
  const slug = tokenName.replace(/\s+/g, "-");
  const direct = `TOKEN-${slug}`;
  if (tokenDefinitions.some((t) => t.cardId === direct)) return direct;
  if (tokenName.toLowerCase() === "familiar") return "TOKEN-Familiar-Token";
  return tokenDefinitions.find((t) => t.nameEn.toLowerCase() === tokenName.toLowerCase())?.cardId;
}

export function isTokenDefinition(def: CardDefinition): boolean {
  return def.isToken === true || def.set === "TOKEN";
}
