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
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the play cost by 5",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Tamer"],
                  nameOrTrait: [
                    {
                      tokens: ["Zaxon"],
                      match: "trait",
                    },
                  ],
                },
                raw: "you have a Tamer with the [Zaxon] trait",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with 9000 DP or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 9000,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, you may return up to 3 non-Digi-Egg cards from their trash to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "opponent",
              kind: ["Digimon", "Tamer", "Option"],
            },
            count: 3,
            upTo: true,
          },
          to: "deckBottom",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with 9000 DP or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 9000,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, you may return up to 3 non-Digi-Egg cards from their trash to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "opponent",
              kind: ["Digimon", "Tamer", "Option"],
            },
            count: 3,
            upTo: true,
          },
          to: "deckBottom",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] [When Attacking] [Once Per Turn] Delete 1 of your opponent's Digimon with 9000 DP or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 9000,
              },
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, you may return up to 3 non-Digi-Egg cards from their trash to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "opponent",
              kind: ["Digimon", "Tamer", "Option"],
            },
            count: 3,
            upTo: true,
          },
          to: "deckBottom",
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
          faceUp: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-015", compiled);
