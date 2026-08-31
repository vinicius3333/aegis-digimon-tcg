// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT21-030 Shoutmon X7: Superior Mode — hand-authored IR override.
//
// When played: by placing 1 [Shoutmon] under it, reduce play cost by 1 AND cards in
// your trash can also be placed for DigiXros (in addition to hand).
//
// [On Play] / [When Digivolving]: Trash the top 10 stacked cards of 1 opponent's Digimon.
// KB Q4540: stops when no more stacked cards remain (not the Digimon top card).
// TrashDigivolution amount:10 fromTop:true reproduces this — mills min(10, stack.length).
//
// [When Attacking] [Once Per Turn]: You may return 1 of your opponent's Digimon with
// NO digivolution cards to the bottom of the deck.
//
// DigiXros -1: ∞ Digimon cards with [Xros Heart] or [Blue Flare] trait & different card numbers.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 1,
          actions: [
            {
              kind: "SelectBind",
              target: {
                filter: {
                  nameOrTrait: [{ tokens: ["Shoutmon"], match: "nameExact" }],
                  controller: "mine",
                  zone: "battleArea",
                },
                count: 1,
                bindAs: "bt21030Shoutmon",
              },
            },
            {
              kind: "TrashDigivolution",
              target: { fromSelectionRef: "bt21030Shoutmon", filter: {}, count: 1 },
              amount: 99,
            },
            {
              kind: "PlaceUnder",
              target: { fromSelectionRef: "bt21030Shoutmon", filter: {}, count: 1 },
              targetIsPermanent: true,
              underFilter: { isTriggerSource: true },
            },
          ],
          additionalEffects: [
            {
              kind: "AllowDigiXrosMaterialsFromTrash",
              raw: "cards in your trash can also be placed for DigiXros",
            },
          ],
          raw: "When this card would be played, by placing 1 of your [Shoutmon] under it, reduce the play cost by 1 and cards in your trash can also be placed for DigiXros",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 10,
          fromTop: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 10,
          fromTop: true,
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
              digivolutionCards: "none",
            },
            count: 1,
          },
          to: "deckBottom",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      traits: ["Hero"],
      cost: 3,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"], match: "trait" }],
          differentCardNumbers: true,
        },
      ],
      count: "∞",
      costReduction: 1,
    },
  ],
};

registerIrCard("BT21-030", compiled);
