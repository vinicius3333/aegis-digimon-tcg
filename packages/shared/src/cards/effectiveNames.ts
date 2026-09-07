import type { CardDefinition } from "./types.js";

/**
 * Cards whose source `CardNames` list carries more than the printed `nameEn`. Digivolution
 * name gates read that list, so "[Digivolve] [Takuya Kanbara]" must also accept a Tamer such as
 * AD1-020 ("Tommy, Takuya, & Zoe") whose entry includes "Takuya Kanbara".
 */
const STATIC_NAME_ALIASES_BY_CARD_ID: Record<string, string[]> = {
  "AD1-020": ["Tommy Himi", "Takuya Kanbara", "Zoe Orimoto"],
  "AD1-023": ["J.P. Shibayama", "Koji Minamoto", "Koichi Kimura"],
  "BT18-088": ["Takuya Kanbara", "Koji Minamoto"],
  "ST24-13": ["Marcus Damon", "Thomas H. Norstein"],
  "BT20-089": ["Eiji Nagasumi", "Leon Alexander"],
  // Special rule text is phrased "Also treat as if name is...", outside the
  // generic "this card is also treated" parser. KB Q759: applies in every zone.
  "ST12-13": ["Sistermon Noir"],
  // BT6-084's Q1470 erratum makes the alias universal even though the committed
  // catalog effect text predates the standardized (Rule) wording.
  "BT6-084": ["Sistermon Noir"],
  // The committed BT11-009 text predates standardized `(Rule) Name:` wording.
  // Q2054 confirms both aliases apply unconditionally in every zone.
  "BT11-009": ["Shoutmon", "Starmons"],
};

/** Names granted by printed "this card is also treated as [X]" text. */
function parsedStaticNameAliases(def: CardDefinition): string[] {
  // BT15-060's Omnimon alias is explicitly limited to the card while it is revealed
  // from a deck. It is supplied by the reveal-context definition projection instead
  // of the universal static-name list.
  if (def.cardId === "BT15-060") return [];
  const text = def.effectText ?? "";
  const aliases: string[] = [];
  const aliasPhrases = [
    ...(text.match(/(?:name of )?this card(?:\/(?:Digimon|Tamer))?[^.。]*also treated[^.。]*/gi) ?? []),
    // The catalog prints both "(Rule) Name:" and "[Rule] Name:"; KB Q759 applies either in every zone.
    ...(text.match(/[[(]Rule[\])]\s*Name:\s*(?:Also\s+)?treated as(?:\s+having)?[^.。]*/gi) ?? []),
  ];
  for (const phrase of aliasPhrases) {
    // A material-only alias must not satisfy ordinary evolution or name gates.
    if (/for\s+(?:a\s+)?DigiXros\b/i.test(phrase)) continue;
    for (const match of phrase.matchAll(/\[([^\]]+)\]/g)) {
      aliases.push(match[1]!.trim());
    }
  }
  return aliases;
}

/**
 * Every name a card answers to for a name gate: its printed `nameEn` plus any alias from the
 * table above or from its own "also treated as [X]" text. Server legality and client
 * highlighting both read this so they cannot disagree about which bases a name gate accepts.
 */
export function effectiveStaticNames(def: CardDefinition): string[] {
  const names = [def.nameEn, ...(STATIC_NAME_ALIASES_BY_CARD_ID[def.cardId] ?? []), ...parsedStaticNameAliases(def)];
  return [...new Set(names.filter((name) => name.length > 0))];
}
