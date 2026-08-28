// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT22-077 (Dianamon).
// [When Digivolving]:
//   - IF this Digimon's stack has 2+ same-level cards: trash any 4 digivolution cards
//     from your opponent's Digimon (across any targets, distributed as chosen).
//     KB Q4941: "2+ same-level" means any 2 cards at the same level in the stack.
//   - THEN (unconditionally per KB Q4942): return 1 opponent Digimon with ≤1 digi-card
//     to bottom of deck.
// [End of Your Turn]: inherited unsuspend effect is a separate effect from the
// non-inherited one (both fire, once per turn each).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "IceClad", raw: "＜Ice Clad＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          // Conditional: only if this Digimon's stack has 2+ same-level cards.
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            // "Any 4" can be distributed across multiple opponent Digimon.
            count: "any",
          },
          amount: 4,
          condition: {
            kind: "stackHasSameLevelCards",
            minCount: 2,
            raw: "this Digimon's stack has 2 or more same-level cards",
          },
        },
        {
          // Unconditional per KB Q4942 — can execute even if condition above wasn't met.
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsLte: 1,
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Night Claw", "Light Fang", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-077", compiled);
