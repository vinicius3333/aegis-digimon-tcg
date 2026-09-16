import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          kind: "TrashTopStackedCards",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 10,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopStackedCards",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 10,
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
      cost: 5,
      isAlternate: true,
    },
  ],
  digiXrosRequirement: [
    {
      materials: [
        {
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
