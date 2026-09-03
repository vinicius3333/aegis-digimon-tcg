import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [All Turns]: This Digimon with no digivolution cards (1) can't be suspended AND
// (2) isn't affected by opponent's effects. Both clauses apply only when Digimon has
// no digivolution cards (condition on both Restrict actions).
// [On Play]/[When Digivolving]/[When Attacking]: cost = return 1 Digimon card from
// opponent's TRASH to top of deck; effect = return 1 of their Digimon (from battle area)
// to bottom of deck. The "By returning" processing condition is optional under CR 15-7-1;
// abortOnDecline prevents the dependent bottom-deck return when its cost is declined.
// KB Q3185 confirms can't-be-suspended + Overclock combo.
// digivolutionRequirement: must digivolve from MoonMillenniummon (name match).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Overclock",
          raw: "＜Overclock ([Composite] trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              zone: "battleArea",
            },
            count: 1,
          },
          to: "deckBottom",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            to: "deckTop",
            raw: "By returning 1 Digimon card from your opponent's trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              zone: "battleArea",
            },
            count: 1,
          },
          to: "deckBottom",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            to: "deckTop",
            raw: "By returning 1 Digimon card from your opponent's trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              zone: "battleArea",
            },
            count: 1,
          },
          to: "deckBottom",
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            to: "deckTop",
            raw: "By returning 1 Digimon card from your opponent's trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          restriction: "beSuspended",
          duration: "permanent",
          condition: {
            kind: "selfHasNoDigivolutionCards",
          },
        },
        {
          kind: "GrantImmunity",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          immuneFrom: "opponentEffects",
          duration: "permanent",
          condition: {
            kind: "selfHasNoDigivolutionCards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["MoonMillenniummon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-101", compiled);
