// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const evilTraits = [{ tokens: ["Evil", "Dark Dragon", "Evil Dragon"], match: "trait" }];
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Trash", target: { filter: { zone: "hand", controller: "mine" }, count: 2 } },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", relativeToSource: true } },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              playCostLte: 8,
              playCostLteScaling: { per: 1, filter: { zone: "hand", controller: "mine" }, unit: "cards", subtract: 1 },
              nameOrTrait: evilTraits,
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-062", compiled);
