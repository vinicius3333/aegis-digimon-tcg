import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "protectedHost",
          },
          restriction: "beReturned",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Appmon", "Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            bindHostAs: "protectedHost",
            raw: "By placing 1 [Appmon]/[Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "cantBeDeDigivolved",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "protectedHost",
          },
          restriction: "beReturned",
          byOpponentEffectsOnly: true,
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Appmon", "Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            bindHostAs: "protectedHost",
            raw: "By placing 1 [Appmon]/[Three Musketeers] trait card from your hand or trash as any of your Digimon's bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          restriction: "cantBeDeDigivolved",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Appmon", "Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Appmon]/[Three Musketeers] trait from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Appmon", "Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Appmon]/[Three Musketeers] trait from your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  linkRequirement: [{ traits: ["Appmon"], cost: 3 }],
  digivolutionRequirement: [
    {
      level: 4,
      texts: ["Three Musketeers"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-074", compiled);
