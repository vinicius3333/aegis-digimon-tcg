import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const evilTraits: NonNullable<Filter["nameOrTrait"]> = [
  { tokens: ["Evil", "Dark Dragon", "Evil Dragon"], match: "trait" },
];
export const compiled: CompiledCard = {
  digivolutionRequirement: [{ level: 5, traits: ["Dark Dragon", "Evil Dragon"], cost: 4, isAlternate: true }],
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Trash2 cards in your hand.",
          kind: "Trash",
          target: { filter: { zone: "hand", controller: "mine" }, count: 2 },
        },
        {
          effectTextPart: "Then, delete1 of your opponent's Digimon with as much or less DP as this Digimon.",
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
