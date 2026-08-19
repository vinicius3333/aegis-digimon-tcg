import { getCardDefinition } from "@aegis/shared";

/**
 * The materials a ＜Blast DNA Digivolve＞ keyword names (Comprehensive Rules §16-31-1).
 *
 * The keyword prints its materials inline — "＜Blast DNA Digivolve ([WarGreymon] +
 * [MetalGarurumon])＞" — and no structured field compiles for them, so they are read back off the
 * printed text. Waiving the memory cost never waives the materials: without this, any pair of
 * Digimon could DNA digivolve into the card simply because the cost step was skipped.
 *
 * Returns the names in printed order, or undefined when the card has no such keyword (or prints
 * it without a material list). Parsed once per card and memoised.
 */
const cache = new Map<string, readonly string[] | undefined>();

const KEYWORD = /[<＜]\s*Blast\s+DNA\s+Digivolve\s*\(([^)]*)\)/i;
const NAME = /\[([^\]]+)\]/g;

export function blastDnaMaterialNames(cardId: string): readonly string[] | undefined {
  if (cache.has(cardId)) return cache.get(cardId);
  const text = getCardDefinition(cardId)?.effectText ?? "";
  const keyword = KEYWORD.exec(text);
  const names = keyword === null ? [] : [...keyword[1]!.matchAll(NAME)].map((match) => match[1]!.trim());
  const parsed = names.length > 0 ? names : undefined;
  cache.set(cardId, parsed);
  return parsed;
}

/**
 * Whether `materialNames` covers exactly the names the keyword lists — one material per named
 * slot, matched pairwise without reuse. Order does not matter (the player chooses which of their
 * Digimon fills which slot), but every slot must be filled and nothing may be left over.
 */
export function blastDnaMaterialsMatch(materialNames: readonly string[], required: readonly string[]): boolean {
  if (materialNames.length !== required.length) return false;
  const remaining = [...materialNames];
  for (const name of required) {
    const index = remaining.indexOf(name);
    if (index < 0) return false;
    remaining.splice(index, 1);
  }
  return true;
}
