// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                digivolutionCards: "hasAny",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Gallantmon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
            },
            raw: "By deleting 1 of your Digimon with digivolution cards and [Gallantmon] in its name",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      isFromTrash: true,
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
                value: 7000,
              },
            },
            count: 1,
          },
          dpCeiling: 7000,
          dpCeilingScaling: {
            per: 10,
            amount: 2000,
            filter: { zone: "trash", controllerDefault: "both" },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["WarGrowlmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-011", compiled);
