// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Social", "Tool", "Game"],
                  match: "trait",
                },
              ],
              hasLinkRequirement: true,
            },
            count: 1,
          },
          from: ["trash", "digivolutionCards"],
          costDelta: -1,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenLinked",
          on: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  playCostLte: 4,
                },
                count: 1,
              },
            },
          ],
          raw: "When this Digimon gets linked, delete 1 of your opponent's Digimon with a play cost of 4 or less",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  appFusionRequirement: [
    {
      names: ["Offmon", "Hackmon"],
      cost: 0,
    },
  ],
};

registerIrCard("BT25-070", compiled);
