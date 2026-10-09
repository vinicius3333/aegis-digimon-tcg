import type { CardDefinition } from "./types.js";

/**
 * Comparison key for a trait token. The catalog spells some traits differently from their
 * printed text: "BlueFlare" for [Blue Flare], "X-Antibody" for [X Antibody], "NSp" for [NSP].
 * A trait is a whole-token identity, and no two distinct traits differ only by case, spaces or
 * hyphens, so folding those cannot merge separate traits.
 */
export function traitKey(trait: string): string {
  return trait.toLowerCase().replace(/[\s-]+/g, "");
}

/** True when two trait tokens name the same trait (see {@link traitKey}). */
export function sameTrait(a: string, b: string): boolean {
  return traitKey(a) === traitKey(b);
}

/**
 * Every "Trait:" clause of a printed Rule line. The catalog prints several phrasings, and each
 * applies in every zone: "[Rule] Trait: Has the [X] type", "(Rule) Trait: Has [X] and [Y]",
 * "(Rule) Also treated as Name: [N] and has Trait: [X]" (BT24-086), and
 * "[Rule] Also has Name: [N] and Trait: [X] Attribute" (EX13-066).
 */
const RULE_TRAIT_CLAUSE = /[[(]Rule[\])][^.。]*?Trait:\s*([^.。]*)/gi;

function ruleTraitsOf(def: Pick<CardDefinition, "effectText">): string[] {
  return [...(def.effectText ?? "").matchAll(RULE_TRAIT_CLAUSE)].flatMap((clause) =>
    [...clause[1]!.matchAll(/\[([^\]]+)\]/g)].map((trait) => trait[1]!.trim()),
  );
}

/**
 * The traits a card has in every zone: printed forms, attributes, and types plus the traits its
 * Rule text adds. Hand, trash, deck, and material matchers must read this rather than the three
 * printed arrays, or a Rule trait such as EX13-025 Candlemon's [Witchelny] goes unseen.
 */
export function effectiveStaticTraits(def: CardDefinition): string[] {
  const byLowercase = new Map<string, string>();
  for (const trait of [...(def.forms ?? []), ...(def.attributes ?? []), ...(def.types ?? []), ...ruleTraitsOf(def)]) {
    if (!byLowercase.has(trait.toLowerCase())) byLowercase.set(trait.toLowerCase(), trait);
  }
  return [...byLowercase.values()];
}

/**
 * The card's printed type traits plus its Rule traits, without forms or attributes. Substring
 * trait filters ("a trait containing [Dragon]") read only these.
 */
export function effectiveTypeTraits(def: Pick<CardDefinition, "types" | "effectText">): string[] {
  return [...(def.types ?? []), ...ruleTraitsOf(def)];
}
