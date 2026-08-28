// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
