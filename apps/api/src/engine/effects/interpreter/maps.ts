// Lookup tables translating IR string literals into engine enums.

import type { EnforcedRestriction } from "../EffectContext.js";
import { CardColor, CardKind } from "@aegis/shared";
import type { Filter } from "@aegis/shared";

// ---------------------------------------------------------------------------
// Filter primitives shared by permanent- and definition-level matching
// ---------------------------------------------------------------------------

export const KIND_MAP: Record<NonNullable<Filter["kind"]>[number], CardKind> = {
  Digimon: CardKind.Digimon,
  Tamer: CardKind.Tamer,
  Option: CardKind.Option,
  DigiEgg: CardKind.DigiEgg,
};

export const COLOR_MAP: Record<NonNullable<Filter["colors"]>[number], CardColor> = {
  Red: CardColor.Red,
  Blue: CardColor.Blue,
  Yellow: CardColor.Yellow,
  Green: CardColor.Green,
  White: CardColor.White,
  Black: CardColor.Black,
  Purple: CardColor.Purple,
};

/**
 * `GrantStatic grant: { kind: "Protection", protections: [...] }` token vocabulary (BT16-055,
 * P-162, ST17-07). Each protection decomposes to a single ALREADY enforced restriction kind;
 * `byOpponentEffectsOnly` mirrors the printed wording exactly (some protections are scoped to
 * "your opponent's effects", others — "isn't affected by <De-Digivolve> effects" — are not).
 */
export const PROTECTION_TOKEN_MAP: Record<
  string,
  { restriction: EnforcedRestriction; byOpponentEffectsOnly?: boolean }
> = {
  dpReduction: { restriction: "dpImmune", byOpponentEffectsOnly: true },
  deDigivolve: { restriction: "cantBeDeDigivolved" },
  deletion: { restriction: "beDeleted", byOpponentEffectsOnly: true },
  returnToHandOrDeck: { restriction: "beReturned", byOpponentEffectsOnly: true },
};

/**
 * `GrantStatic grant: "protection"` string-form token vocabulary (BT24-055, EX7-041, ST13-14).
 * Distinct key spellings from {@link PROTECTION_TOKEN_MAP} (the compiler's other encoding of the
 * same concept), but every printed instance is opponent-scoped, unlike some
 * `PROTECTION_TOKEN_MAP` entries.
 */
export const PROTECTION_STRING_TOKEN_MAP: Record<string, EnforcedRestriction> = {
  beDeDigivolved: "cantBeDeDigivolved",
  beDeletedByEffects: "beDeleted",
  beReturnedToHandOrDeck: "beReturned",
};
