import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Ornismon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "allOf",
            conditions: [
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["Darcmon"], match: "name" }] },
              },
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["HippoGryphonmon"], match: "name" }] },
              },
            ],
            raw: "[Darcmon] and [HippoGryphonmon] are in this Digimon's digivolution cards",
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                zone: "battleArea",
              },
              count: 1,
            },
            raw: "by deleting 1 of your other Digimon",
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
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    relativeTo: "lastDeleted",
                  },
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Darcmon"],
      minNameStackCount: 1,
      minNameStackNames: ["HippoGryphonmon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-071", compiled);
