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
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 3,
              raw: "reduce the play cost by 3",
              cost: {
                kind: "return",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Apocalymon"], match: "name" }],
                  },
                  count: 1,
                },
                to: "deckBottom",
                raw: "by returning 1 [Apocalymon] from your trash to the bottom of the deck",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Gulfmon"], match: "name" }] },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levels: [6],
                nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }],
              },
            ],
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          condition: { kind: "triggerRemovalCause", removalCause: "byEffect" },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "forTheTurn",
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                levelComparison: { op: "lte", value: 5 },
                nameOrTrait: [{ tokens: ["Dark Masters"], match: "text" }],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 level 5 or lower card with [Dark Masters] in its text from your trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-068", compiled);
