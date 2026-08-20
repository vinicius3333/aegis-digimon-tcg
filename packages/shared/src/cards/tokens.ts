import { CardColor, CardKind } from "../schema/enums.js";
import type { CardDefinition } from "./types.js";

/** Synthetic token definitions (not in the printed card corpus). */
export const tokenDefinitions: readonly CardDefinition[] = [
  tok("Diaboromon", { level: 6, dp: 3000, playCost: 14, colors: [CardColor.White], types: ["Unknown", "Unidentified"] }),
  tok("Diaboromon Token", { level: 6, dp: 3000, playCost: 14, colors: [CardColor.White], types: ["Unknown", "Unidentified"] }),
  tok("Familiar Token", { level: 3, dp: 3000, playCost: 0, colors: [CardColor.Yellow] }),
  tok("SelfDeleteFamiliar Token", { level: 3, dp: 1000, playCost: 0, colors: [CardColor.Purple] }),
  tok("Amon Token", { level: 6, dp: 11000, playCost: 11, colors: [CardColor.Purple] }),
  tok("Umon Token", { level: 6, dp: 11000, playCost: 11, colors: [CardColor.Purple] }),
  tok("KoHagurumon Token", { level: 3, dp: 3000, playCost: 3, colors: [CardColor.Black] }),
  tok("WarGrowlmon Token", { level: 5, dp: 5000, playCost: 5, colors: [CardColor.Red] }),
  tok("Taomon Token", { level: 4, dp: 4000, playCost: 4, colors: [CardColor.Yellow] }),
  tok("Rapidmon Token", { level: 5, dp: 5000, playCost: 5, colors: [CardColor.Yellow] }),
  tok("AthoRenePor Token", { level: 6, dp: 6000, playCost: 6, colors: [CardColor.White] }),
  tok("Petrification Token", { level: 2, dp: 2000, playCost: 2, colors: [CardColor.Black] }),
  tok("Hinukamuy Token", { level: 5, dp: 5000, playCost: 5, colors: [CardColor.Red] }),
  tok("Fujitsumon Token", { level: 4, dp: 4000, playCost: 4, colors: [CardColor.Blue] }),
  tok("Uka no Mitama", { level: 4, dp: 4000, playCost: 4, colors: [CardColor.Yellow] }),
  tok("Gyuukimon Token", { level: 4, dp: 4000, playCost: 4, colors: [CardColor.Purple] }),
  tok("Pipe Fox", { level: 4, dp: 6000, playCost: 4, colors: [CardColor.Yellow] }),
];

function tok(
  nameEn: string,
  stats: { level: number; dp: number; playCost: number; colors: CardColor[]; types?: string[] },
): CardDefinition {
  const slug = nameEn.replace(/\s+/g, "-");
  return {
    cardId: `TOKEN-${slug}`,
    set: "TOKEN",
    nameEn,
    kinds: [CardKind.Digimon],
    colors: stats.colors,
    level: stats.level,
    playCost: stats.playCost,
    dp: stats.dp,
    evoCosts: [],
    types: stats.types,
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
