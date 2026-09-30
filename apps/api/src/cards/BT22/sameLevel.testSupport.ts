import type { EngineSetup } from "../../engine/testkit/harness.js";

/** Vanilla cards by level: a Digi-Egg at 2, purple Digimon from 3 to 6. */
export const CARD_OF_LEVEL = { 2: "BT1-001", 3: "BT2-067", 4: "BT3-083", 5: "BT2-075", 6: "BT3-089" } as const;

type StackLevel = keyof typeof CARD_OF_LEVEL;

export interface SameLevelCase {
  stack: string;
  under: string[];
  sameLevel: boolean;
}

/**
 * The KB "2 or more same-level cards" examples for a level-`top` Digimon whose digivolution
 * cards are `under`: a digivolution card matching the top card, two digivolution cards
 * matching each other, and a stack with no repeated level.
 */
export function sameLevelCases(top: 4 | 5 | 6): SameLevelCase[] {
  const below = (top - 1) as StackLevel;
  const twoBelow = (top - 2) as StackLevel;
  return [
    {
      stack: `a level ${top} digivolution card`,
      under: [CARD_OF_LEVEL[top], CARD_OF_LEVEL[below]],
      sameLevel: true,
    },
    {
      stack: `2 level ${below} digivolution cards`,
      under: [CARD_OF_LEVEL[below], CARD_OF_LEVEL[below]],
      sameLevel: true,
    },
    {
      stack: "no repeated level",
      under: [CARD_OF_LEVEL[twoBelow], CARD_OF_LEVEL[below]],
      sameLevel: false,
    },
  ];
}

/**
 * Seat 0 digivolves `cardAlias` from hand onto the permanent `baseAlias`. A board built from a
 * `SameLevelCase` seeds the base as the case's top `under` card with the rest beneath it.
 */
export function digivolveOnto(s: EngineSetup, baseAlias: string, cardAlias: string) {
  return s.engine.applyIntent(0, {
    type: "digivolve",
    permanentId: s.perm(baseAlias).permanentId,
    instanceId: s.inst(cardAlias).instanceId,
  });
}

/** Board spec for a base permanent that leaves `under` as the stack once a card digivolves onto it. */
export function baseFor(under: string[], as = "base") {
  return { card: under.at(-1)!, as, under: under.slice(0, -1) };
}
